'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Send, Search, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'patient';
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender: UserProfile;
  receiver: UserProfile;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<UserProfile[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch conversations (users who have messaged or been messaged by the current user)
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        setCurrentUserId(user.id);

        // First, get all unique user IDs that the current user has messaged with
        const { data: conversationsData, error } = await supabase
          .from('messages')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        if (error) throw error;

        // Get unique user IDs (excluding the current user)
        const userIds = new Set<string>();
        conversationsData?.forEach(conv => {
          if (conv.sender_id !== user.id) userIds.add(conv.sender_id);
          if (conv.receiver_id !== user.id) userIds.add(conv.receiver_id);
        });

        // Fetch user profiles for these IDs
        if (userIds.size > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('user_profiles')
            .select('*')
            .in('id', Array.from(userIds));

          if (usersError) throw usersError;
          setConversations(usersData || []);
        } else {
          setConversations([]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast.error('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [supabase]);

  // Fetch messages for the selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation || !currentUserId) return;
      
      try {
        setIsLoading(true);

        // Fetch messages between the current user and the selected user
        const { data: messagesData, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedConversation.id}),and(sender_id.eq.${selectedConversation.id},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch sender and receiver details for each message
        const messagesWithUsers = await Promise.all(
          (messagesData || []).map(async (message) => {
            const [sender, receiver] = await Promise.all([
              supabase
                .from('user_profiles')
                .select('*')
                .eq('id', message.sender_id)
                .single(),
              supabase
                .from('user_profiles')
                .select('*')
                .eq('id', message.receiver_id)
                .single()
            ]);

            return {
              ...message,
              sender: sender.data,
              receiver: receiver.data
            } as Message;
          })
        );

        setMessages(messagesWithUsers);

        // Mark messages as read
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('receiver_id', currentUserId)
          .eq('sender_id', selectedConversation.id)
          .eq('is_read', false);

      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `or(and(sender_id=eq.${selectedConversation?.id},receiver_id=eq.${currentUserId}),and(sender_id=eq.${currentUserId},receiver_id=eq.${selectedConversation?.id}))`
        }, 
        async (payload) => {
          const newMessage = payload.new as Message;
          // Fetch sender and receiver details for the new message
          const [sender, receiver] = await Promise.all([
            supabase
              .from('user_profiles')
              .select('*')
              .eq('id', newMessage.sender_id)
              .single(),
            supabase
              .from('user_profiles')
              .select('*')
              .eq('id', newMessage.receiver_id)
              .single()
          ]);

          setMessages(prev => [
            ...prev, 
            {
              ...newMessage,
              sender: sender.data,
              receiver: receiver.data
            }
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, currentUserId, supabase]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => 
    `${conversation.first_name} ${conversation.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: selectedConversation.id,
            content: newMessage.trim(),
            is_read: false,
          },
        ]);

      if (error) throw error;

      // Add the new message to the local state
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender_id: user.id,
          receiver_id: selectedConversation.id,
          content: newMessage.trim(),
          is_read: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sender: {
            id: user.id,
            first_name: user.user_metadata?.first_name || 'You',
            last_name: user.user_metadata?.last_name || '',
            email: user.email || '',
            role: 'admin',
          },
          receiver: selectedConversation,
        } as Message,
      ]);

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Format message timestamp
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return format(date, 'h:mm a');
    } else if (diffInDays < 7) {
      return format(date, 'EEE h:mm a');
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Conversations sidebar */}
      <div className={`${selectedConversation ? 'hidden md:block' : 'w-full'} md:w-80 border-r`}>
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Messages</h2>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search conversations..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100%-4.5rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredConversations.length > 0 ? (
            <div className="divide-y">
              {filteredConversations.map((user) => {
                const unreadCount = 0; // You can implement unread count logic here
                return (
                  <button
                    key={user.id}
                    className={`w-full text-left p-4 hover:bg-muted/50 flex items-center gap-3 ${
                      selectedConversation?.id === user.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedConversation(user)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                      <AvatarFallback>
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-medium truncate">{user.first_name} {user.last_name}</p>
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.role === 'admin' ? 'Staff' : 'Patient'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="font-medium">No conversations found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col h-full">
          {/* Chat header */}
          <div className="border-b p-4 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setSelectedConversation(null)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarImage src={selectedConversation.avatar_url} alt={`${selectedConversation.first_name} ${selectedConversation.last_name}`} />
              <AvatarFallback>
                {selectedConversation.first_name?.[0]}{selectedConversation.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{selectedConversation.first_name} {selectedConversation.last_name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedConversation.role === 'admin' ? 'Staff' : 'Patient'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => {
                  const isCurrentUser = currentUserId ? message.sender_id === currentUserId : false;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-[60%] rounded-lg px-4 py-2 ${
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-muted rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="font-medium">No messages yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Send a message to start the conversation
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message input */}
          <div className="border-t p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Type a message..."
                className="flex-1"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center max-w-md p-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
            <p className="text-muted-foreground">
              Choose a conversation from the sidebar or start a new one to view messages.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
