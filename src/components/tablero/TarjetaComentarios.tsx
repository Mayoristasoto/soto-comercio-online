import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Trash2, Edit2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Comentario {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  edited: boolean;
  created_at: string;
}

interface TarjetaComentariosProps {
  tarjetaId: string;
}

export function TarjetaComentarios({ tarjetaId }: TarjetaComentariosProps) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    const { data } = await (supabase.from('tablero_comentarios') as any)
      .select('*')
      .eq('tarjeta_id', tarjetaId)
      .order('created_at', { ascending: true });
    if (data) setComentarios(data);
  }, [tarjetaId]);

  useEffect(() => {
    fetchComments();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || loading || !currentUserId) return;
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userName = userData.user?.user_metadata?.full_name
      || userData.user?.email
      || 'Usuario';

    const { error } = await (supabase.from('tablero_comentarios') as any).insert({
      tarjeta_id: tarjetaId,
      user_id: currentUserId,
      user_name: userName,
      content: newComment.trim(),
    });

    if (error) {
      toast.error('Error al agregar comentario');
    } else {
      setNewComment('');
      await fetchComments();
    }
    setLoading(false);
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim() || loading) return;
    setLoading(true);

    const { error } = await (supabase.from('tablero_comentarios') as any)
      .update({ content: editContent.trim(), edited: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Error al editar comentario');
    } else {
      setEditingId(null);
      setEditContent('');
      await fetchComments();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    setLoading(true);

    const { error } = await (supabase.from('tablero_comentarios') as any)
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar comentario');
    } else {
      await fetchComments();
    }
    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        Comentarios ({comentarios.length})
      </div>

      <ScrollArea className="max-h-[250px]">
        {comentarios.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sin comentarios aún</p>
        ) : (
          <div className="space-y-3 pr-3">
            {comentarios.map((c) => {
              const isOwner = c.user_id === currentUserId;
              const isEditing = editingId === c.id;

              return (
                <div key={c.id} className="flex gap-2 group">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(c.user_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{c.user_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                        {c.edited && ' (editado)'}
                      </span>

                      {isOwner && !isEditing && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditingId(c.id); setEditContent(c.content); }}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDelete(c.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-1 mt-1">
                        <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[50px] text-xs" disabled={loading} />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs" onClick={() => handleEdit(c.id)} disabled={loading || !editContent.trim()}>Guardar</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditingId(null); setEditContent(''); }}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs whitespace-pre-wrap break-words mt-0.5">{c.content}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* New comment */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe un comentario..."
          className="min-h-[50px] text-xs flex-1"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
        <Button size="icon" className="h-[50px] w-10 shrink-0" onClick={handleSubmit} disabled={loading || !newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
