"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/compat/router';
import styles from "../styles/Pin.module.css";
import { useSearchParams } from 'next/navigation';

export default function Pin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('ID');
  const [userID, setUserID] = useState(null);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false); 
  const [pin, setPin] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const storedUserID = localStorage.getItem('userID');
    setUserID(storedUserID);
    console.log(searchParams);

    if (id) {
      fetchPin(id);
    }
  }, [id]);

  const fetchPin = async (pinId) => {
    try {
      const res = await fetch(`http://localhost:4000/pins/${pinId}`);
      if (!res.ok) throw new Error('Error al cargar el pin');
      const data = await res.json();
      setPin(data);
      setLikes(data.likes); 

      // Comprobar si el usuario ya dio like a este pin
      const likeRes = await fetch(`http://localhost:4000/likes?pin_id=${pinId}&user_id=${userID}`);
      const likeData = await likeRes.json();
      if (likeData.exists) {
        setHasLiked(true); 
      }
    } catch (error) {
      console.error('Error al cargar el pin:', error);
    }
  };

 

  const handleLike = async () => {
    try {
      setHasLiked(true);
      if (hasLiked) {
        // Si el usuario ya le dio like, eliminamos el like
        const res = await fetch(`http://localhost:4000/likes`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin_id: id, user_id: userID })
        });
  
        if (!res.ok) throw new Error(await res.text()); 
  
        const data = await res.json();
  
        // Si el like se eliminó correctamente, actualizamos el estado
        if (data.message === "Like eliminado") {
          setLikes((prevLikes) => prevLikes - 1); // Reducir el contador de likes
          setHasLiked(false); // Cambiar el estado a no tener like
          setErrorMessage(""); // Limpiar mensaje de error
        } else {
          setErrorMessage("Hubo un problema al eliminar el like.");
        }
      } else {
        // Si no le ha dado like, agregamos el like
        const res = await fetch(`http://localhost:4000/likes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin_id: id, user_id: userID })
        });
  
        if (!res.ok) throw new Error(await res.text()); 
  
        const data = await res.json();
  
        // Si el like se añadió con éxito, actualizamos el estado
        if (data.message === "Like agregado") {
          setLikes((prevLikes) => prevLikes + 1); // Incrementar el contador de likes
          setHasLiked(true); // Cambiar el estado a tener like
          setErrorMessage(""); // Limpiar mensaje de error
        } else {
          setErrorMessage("Hubo un problema al agregar el like.");
        }
      }
    } catch (error) {
      console.error('Error al manejar el like:', error);
      setErrorMessage("Hubo un problema al manejar el like.");
    }
  };
  

  if (!pin) return <div>Cargando...</div>;

  return (
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
    </div>
  );
}
