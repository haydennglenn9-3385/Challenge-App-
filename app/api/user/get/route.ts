import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wixId = searchParams.get('wixId');

  if (!wixId) {
    return NextResponse.json({ error: 'Missing wixId' }, { status: 400 });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('wix_id', wixId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}