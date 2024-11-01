"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Pin.module.css';
import io from 'socket.io-client';

const socket = io('http://localhost:4000'); // Conectar con el backend

export default function PinDetail({ params }) {
  const router = useRouter();
  const { id } = router.query;
  const [pin, setPin] = useState(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (id) fetchPinDetails();
  }, [id]);

  const fetchPinDetails = async () => {
    try {
      const res = await fetch(`http://localhost:4000/pins/${id}`);
      if (!res.ok) throw new Error('Error al cargar el pin');
      const data = await res.json();
      setPin(data);
      setComments(data.comments);
    } catch (error) {
      console.error('Error al cargar el pin:', error);
    }
  };

  const handleCommentSubmit = async () => {
    if (!comment) return alert('El comentario no puede estar vacío.');

    try {
      const res = await fetch(`http://localhost:4000/pins/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: comment }),
      });

      if (!res.ok) throw new Error('Error al enviar comentario');
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setComment('');
    } catch (error) {
      console.error('Error al enviar comentario:', error);
    }
  };

  if (!pin) return <p>Cargando...</p>;

  return (
    <div className={styles.container}>
      <h1>{pin.title}</h1>
      <img src={pin.image_url} alt={pin.title} className={styles.image} />
      <p>{pin.likes} Likes</p>

      <div className={styles.commentSection}>
        <h3>Comentarios</h3>
        <ul>
          {comments.map((c) => (
            <li key={c.id}>{c.text}</li>
          ))}
        </ul>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escribe un comentario..."
        />
        <button onClick={handleCommentSubmit}>Enviar</button>
      </div>
    </div>
  );
}
