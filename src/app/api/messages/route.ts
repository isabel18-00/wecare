import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/messages - Get all messages for the current user
export async function GET(request: Request) {
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

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error.message },
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

    const { receiver_id, content } = await request.json();

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
    
    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
