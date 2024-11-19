"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/compat/router';
import styles from "../styles/Pin.module.css";
import { useSearchParams } from 'next/navigation';
import { useSocket } from '../../hooks/useSocket';

export default function Pin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('ID');
  const [userID, setUserID] = useState(null);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false); 
  const [pin, setPin] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const {socket,isConnected} = useSocket();

  useEffect(() => {
    const storedUserID = localStorage.getItem('userID');
    setUserID(storedUserID);

    if (id && storedUserID) {
      fetchPin(id, storedUserID);
    }
  }, [id, userID]);

  
  useEffect(() => {
    if (!socket) return;
  
    socket.on("new-comment", (data) => {
      setComments((prevComments) => [...prevComments, data]);
      console.log("Todos mis comentarios son:", [...comments, data]);
    });
  
    // Limpieza para evitar duplicados de eventos
    return () => {
      socket.off("new-comment");
    };
  }, [socket, comments]);

  function handleCommentSubmit() {
    const commentData = {
      pin_id: id,
      user_id: userID,
      comment_text: newComment,
    };
    setNewComment("");
    socket.emit("send-comment", commentData);
  }

  const fetchPin = async (pinId) => {
    try {
      const res = await fetch(`http://localhost:4000/pins/${pinId}`);
      if (!res.ok) throw new Error('Error al cargar el pin');
      const data = await res.json();
      setPin(data);
      setLikes(data.likes); 
  
      if (userID) {
        const likeRes = await fetch(`http://localhost:4000/likes?pin_id=${pinId}&user_id=${userID}`);
        if (!likeRes.ok) throw new Error('Error al verificar el estado del like');
        const likeData = await likeRes.json();
        setHasLiked(!!likeData.exists); 
      }
    } catch (error) {
      console.error('Error al cargar el pin:', error);
    }
  };
  
  

 

  const handleLike = async () => {
    try {
      setHasLiked(true);
      if (hasLiked) {
        const res = await fetch(`http://localhost:4000/likes`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin_id: id, user_id: userID })
        });
  
        if (!res.ok) throw new Error(await res.text()); 
  
        const data = await res.json();
  
        
        if (data.message === "Like eliminado") {
          setLikes((prevLikes) => prevLikes - 1); 
          setHasLiked(false); 
          setErrorMessage(""); 
        } else {
          setErrorMessage("Hubo un problema al eliminar el like.");
        }
      } else {
        const res = await fetch(`http://localhost:4000/likes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin_id: id, user_id: userID })
        });
  
        if (!res.ok) throw new Error(await res.text()); 
  
        const data = await res.json();
  
      
        if (data.message === "Like agregado") {
          setLikes((prevLikes) => prevLikes + 1); 
          setHasLiked(true); 
          setErrorMessage(""); 
          console.log("se agrego")
        } else {
          ;
        }
      }
    } catch (error) {
      console.error('Error al manejar el like:', error);
      setErrorMessage("Hubo un problema al manejar el like.");
    }
  };
  

  if (!pin) return <div>Cargando...</div>;

  return (
    <div>
    {/* Colocamos el enlace fuera del contenedor principal */}
    <a href="../home">
      <img className={styles["icono-volver"]} src="flecha_izquierda.png" alt="Volver atras" />
    </a>
    <div className={styles.pinContainer}>
      <img src={pin.image_url} alt={pin.title} className={styles.image} />
      <h1 className={styles.pinTitle}>{pin.title}</h1>
      <p className={styles.pinUser}>Subido por: {pin.username}</p>
      <h2 className={styles.pinDescription}>{pin.description}</h2>

      <button
        onClick={handleLike}
        className={`${styles.button} ${hasLiked ? styles.liked : ''}`} 
      >
        {hasLiked ? "Like ❤️" : "Like"} 
      </button>

    
      {errorMessage && <p className={`${styles.errorMessage} ${errorMessage ? styles.error : ''}`}>{errorMessage}</p>}

      <div className={styles.chatContainer}>
        <h3>Comentarios</h3>
        <div className={styles.comments}>
          {comments.map((comment, index) => (
            <div key={index} className={styles.comment}>
              <strong>{comment.user_id === userID ? "Yo" : comment.user_id}:</strong> {comment.comment_text}
            </div>
          ))}
        </div>

        <div className={styles.commentInput}>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
            className={styles.commentInputField}
          />
          <button onClick={handleCommentSubmit} className={styles.sendButton}>Enviar</button>
        </div>
      </div>
    </div>
    </div>
  );
}
