import { useState } from "react";
import { MessageSquare, Send, Trash2, Edit2, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useConfirm } from "@/hooks/useConfirm";
import { EmptyState } from "@/components/ui/empty-state";

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  edited?: boolean;
}

interface CommentsProps {
  comments: Comment[];
  currentUserId: string;
  onAddComment: (content: string) => Promise<void>;
  onEditComment?: (id: string, content: string) => Promise<void>;
  onDeleteComment?: (id: string) => Promise<void>;
  placeholder?: string;
  maxHeight?: string;
  className?: string;
}

export function Comments({
  comments,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  placeholder = "Escribe un comentario...",
  maxHeight = "400px",
  className = "",
}: CommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const { confirm, ConfirmationDialog } = useConfirm();

  const handleSubmit = async () => {
    if (!newComment.trim() || loading) return;

    setLoading(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment("");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim() || !onEditComment || loading) return;

    setLoading(true);
    try {
      await onEditComment(id, editContent.trim());
      setEditingId(null);
      setEditContent("");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteComment) return;

    const confirmed = await confirm({
      title: "¿Eliminar comentario?",
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant: "destructive",
    });

    if (confirmed) {
      setLoading(true);
      try {
        await onDeleteComment(id);
      } finally {
        setLoading(false);
      }
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">
            Comentarios ({comments.length})
          </h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de comentarios */}
        <ScrollArea style={{ maxHeight }}>
          {comments.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No hay comentarios"
              description="Sé el primero en comentar"
              className="py-8"
            />
          ) : (
            <div className="space-y-4 pr-4">
              {comments.map((comment) => {
                const isOwner = comment.userId === currentUserId;
                const isEditing = editingId === comment.id;

                return (
                  <div
                    key={comment.id}
                    className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={comment.userAvatar} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">
                            {comment.userName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(comment.timestamp, {
                              addSuffix: true,
                              locale: es,
                            })}
                            {comment.edited && " (editado)"}
                          </p>
                        </div>

                        {isOwner && !isEditing && (
                          <div className="flex gap-1">
                            {onEditComment && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => startEdit(comment)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                            {onDeleteComment && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-error"
                                onClick={() => handleDelete(comment.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[60px]"
                            disabled={loading}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEdit(comment.id)}
                              disabled={loading || !editContent.trim()}
                            >
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              disabled={loading}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Nuevo comentario */}
        <div className="space-y-2 pt-4 border-t">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={placeholder}
            className="min-h-[80px]"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleSubmit();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Ctrl + Enter para enviar
            </span>
            <Button
              onClick={handleSubmit}
              disabled={loading || !newComment.trim()}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Comentar
            </Button>
          </div>
        </div>
      </CardContent>

      <ConfirmationDialog />
    </Card>
  );
}
