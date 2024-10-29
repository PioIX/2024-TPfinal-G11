"use client"
import { useState, useEffect } from 'react';

const Comments = ({ pinId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Obtener comentarios al cargar el componente
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`http://localhost:4000/pins/${pinId}/comments`);
        if (!res.ok) throw new Error('Error al cargar comentarios');
        const data = await res.json();
        setComments(data);
      } catch (error) {
        console.error('Error al obtener comentarios:', error);
      }
    };

    fetchComments();
  }, [pinId]);

  // Manejar la adición de un nuevo comentario
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await fetch('http://localhost:4000/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: pinId, user_id: 1, content: newComment }), // Asume un usuario con ID 1
      });

      if (!res.ok) throw new Error('Error al agregar comentario');
      const addedComment = await res.json();
      setComments((prev) => [addedComment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error al agregar comentario:', error);
    }
  };

  return (
    <div className="comments-section">
      <h4>Comentarios</h4>
      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <p>{comment.content}</p>
            <small>{new Date(comment.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>

      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Escribe un comentario..."
      />
      <button onClick={handleAddComment}>Comentar</button>
    </div>
  );
};

export default Comments;
