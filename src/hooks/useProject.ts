import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProjectMeta {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SavedProject {
  id: string;
  title: string;
  workspace: Record<string, unknown>;
}

export function useProject() {
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Untitled');

  const saveProject = useCallback(
    async (
      userId: string,
      title: string,
      workspace: Record<string, unknown>
    ): Promise<string | null> => {
      setSaving(true);
      try {
        if (projectId) {
          // Update existing
          const { error } = await supabase
            .from('projects')
            .update({ title, workspace })
            .eq('id', projectId)
            .eq('user_id', userId);
          if (error) throw error;
          setProjectTitle(title);
          return projectId;
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('projects')
            .insert({ user_id: userId, title, workspace })
            .select('id')
            .single();
          if (error) throw error;
          setProjectId(data.id);
          setProjectTitle(title);
          return data.id;
        }
      } catch (err) {
        console.error('Save failed:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [projectId]
  );

  const loadProject = useCallback(
    async (id: string): Promise<SavedProject | null> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, workspace')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      setProjectId(data.id);
      setProjectTitle(data.title);
      return data as SavedProject;
    },
    []
  );

  const listMyProjects = useCallback(
    async (userId: string): Promise<ProjectMeta[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) return [];
      return data as ProjectMeta[];
    },
    []
  );

  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) return false;
      if (projectId === id) {
        setProjectId(null);
        setProjectTitle('Untitled');
      }
      return true;
    },
    [projectId]
  );

  const newProject = useCallback(() => {
    setProjectId(null);
    setProjectTitle('Untitled');
  }, []);

  return {
    projectId,
    projectTitle,
    saving,
    saveProject,
    loadProject,
    listMyProjects,
    deleteProject,
    newProject,
    setProjectTitle,
  };
}
