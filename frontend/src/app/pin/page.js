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

    if (id && storedUserID) {
      fetchPin(id, storedUserID);
    }
  }, [id, userID]);

  const fetchPin = async (pinId) => {
    try {
      // Obtiene los datos del pin
      const res = await fetch(`http://localhost:4000/pins/${pinId}`);
      if (!res.ok) throw new Error('Error al cargar el pin');
      const data = await res.json();
      setPin(data);
      setLikes(data.likes); 
  
      // Comprueba el estado del like si userID está definido
      if (userID) {
        const likeRes = await fetch(`http://localhost:4000/likes?pin_id=${pinId}&user_id=${userID}`);
        if (!likeRes.ok) throw new Error('Error al verificar el estado del like');
        const likeData = await likeRes.json();
        setHasLiked(!!likeData.exists); // true si existe el like, false si no
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
  
        // Si el like se añadió con éxito, actualizamos el estado
        if (data.message === "Like agregado") {
          setLikes((prevLikes) => prevLikes + 1); // Incrementar el contador de likes
          setHasLiked(true); // Cambiar el estado a tener like
          setErrorMessage(""); // Limpiar mensaje de error
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
