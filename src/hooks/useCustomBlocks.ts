import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CustomBlockMeta {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  colour: number;
  is_public: boolean;
  created_at: string;
}

export interface CustomBlockFull extends CustomBlockMeta {
  definition: Record<string, unknown>;
  generator_code: string;
}

export function useCustomBlocks() {
  const [saving, setSaving] = useState(false);

  const listMyBlocks = useCallback(async (userId: string): Promise<CustomBlockMeta[]> => {
    const { data, error } = await supabase
      .from('custom_blocks')
      .select('id, user_id, name, description, category, colour, is_public, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data ?? [];
  }, []);

  const listPublicBlocks = useCallback(async (): Promise<CustomBlockMeta[]> => {
    const { data, error } = await supabase
      .from('custom_blocks')
      .select('id, user_id, name, description, category, colour, is_public, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data ?? [];
  }, []);

  const getBlock = useCallback(async (id: string): Promise<CustomBlockFull | null> => {
    const { data, error } = await supabase
      .from('custom_blocks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) { console.error(error); return null; }
    return data as CustomBlockFull;
  }, []);

  const saveBlock = useCallback(async (
    userId: string,
    block: Omit<CustomBlockFull, 'id' | 'user_id' | 'created_at'>
  ): Promise<string | null> => {
    setSaving(true);
    const { data, error } = await supabase
      .from('custom_blocks')
      .insert({ user_id: userId, ...block } as never)
      .select('id')
      .single();
    setSaving(false);
    if (error) { console.error(error); return null; }
    return (data as { id: string } | null)?.id ?? null;
  }, []);

  const updateBlock = useCallback(async (
    id: string,
    updates: Partial<Pick<CustomBlockFull, 'name' | 'description' | 'category' | 'colour' | 'definition' | 'generator_code' | 'is_public'>>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('custom_blocks')
      .update(updates as never)
      .eq('id', id);
    if (error) { console.error(error); return false; }
    return true;
  }, []);

  const deleteBlock = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('custom_blocks')
      .delete()
      .eq('id', id);
    if (error) { console.error(error); return false; }
    return true;
  }, []);

  return { saving, listMyBlocks, listPublicBlocks, getBlock, saveBlock, updateBlock, deleteBlock };
}
