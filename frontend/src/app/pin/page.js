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
  const [hasLiked, setHasLiked] = useState(false); // Estado para verificar si el usuario ya dio like
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
      setLikes(data.likes); // Actualizar el contador de likes

      // Comprobar si el usuario ya dio like a este pin
      const likeRes = await fetch(`http://localhost:4000/likes?pin_id=${pinId}&user_id=${userID}`);
      const likeData = await likeRes.json();
      if (likeData.exists) {
        setHasLiked(true); // Si el usuario ya dio like, actualizar el estado
      }
    } catch (error) {
      console.error('Error al cargar el pin:', error);
    }
  };

  const handleLike = async () => {
    if (hasLiked) {
      setErrorMessage("Ya has dado like a este pin.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: id, user_id: userID })
      });

      if (!res.ok) throw new Error(await res.text()); // Leer y lanzar el error

      const data = await res.json();
      setLikes((prevLikes) => prevLikes + 1); // Actualizar el contador de likes
      setHasLiked(true); // Marcar que el usuario ha dado like
      setErrorMessage(""); // Limpiar mensaje de error si el like fue exitoso
    } catch (error) {
      console.error('Error al dar like:', error);
      setErrorMessage("Hubo un problema al dar like.");
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
        className={`${styles.button} ${hasLiked ? styles.liked : ''}`} // Cambiar clase si ya dio like
      >
        {hasLiked ? "♥️ Ya te gusta" : "Like ❤️"} {/* Cambiar el texto según si ya le dio like */}
      </button>

    
      {errorMessage && <p className={`${styles.errorMessage} ${errorMessage ? styles.error : ''}`}>{errorMessage}</p>}

      <p className={styles.pinLikes}>{likes} </p> {/* Contador de likes */}
    </div>
  );
}
