import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Define the expected structure of message data from the database
interface DatabaseMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  receiver: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

// Define the response type for the GET endpoint
type MessagesResponse = DatabaseMessage[] | { error: string };

// GET /api/messages - Get all messages for the current user
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get messages where the current user is either the sender or receiver
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role),
        receiver:profiles!messages_receiver_id_fkey(id, full_name, avatar_url, role)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json<MessagesResponse>(messages);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages';
    console.error('Error fetching messages:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/messages - Send a new message
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { receiver_id, content } = await request.json() as { receiver_id?: string; content?: string };

    if (!receiver_id || !content) {
      return NextResponse.json(
        { error: 'Receiver ID and content are required' },
        { status: 400 }
      );
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: user.id,
          receiver_id,
          content,
          is_read: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // In a real app, you might want to send a real-time notification here
    
    return NextResponse.json<DatabaseMessage>(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
    console.error('Error sending message:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
