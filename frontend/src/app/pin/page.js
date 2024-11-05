"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/compat/router';  
import styles from "../styles/Pin.module.css";
import { useSearchParams } from 'next/navigation';

export default function Pin() {
  const router = useRouter();
  const searchParams = useSearchParams()
  const id = searchParams.get('ID');

  const [pin, setPin] = useState(null);

  useEffect(() => {
    const storedUserID = localStorage.getItem('userID');
    setUserID(storedUserID);
    console.log(searchParams)
    if (id) {
      fetchPin(id);
    }
  }, [id]);

  const fetchPin = async (pinId) => {
    try {
      const res = await fetch(`http://localhost:4000/pins/${pinId}`);
      if (!res.ok) throw new Error('Error al cargar el pin');
      const data = await res.json();
      console.log(data);
      setPin(data);
      setLikes(data.likes);
    } catch (error) {
      console.error('Error al cargar el pin:', error);
    }
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`http://localhost:4000/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: id, user_id: userID })
      });
      if (!res.ok) throw new Error('Error al dar like');

      const data = await res.json();
      // Actualiza el contador de likes según la respuesta
      setLikes((prevLikes) => (data.message === 'Like agregado' ? prevLikes + 1 : prevLikes - 1));
    } catch (error) {
      console.error('Error al dar like:', error);
    }
  };


  if (!pin) return <div>Cargando...</div>;

  return (
    <div className={styles.pinContainer}>
    <img src={pin.image_url} alt={pin.title} className={styles.image} />
    <h1 className={styles.pinTitle}>{pin.title}</h1>
    <p className={styles.pinDescription}>{pin.description}</p>
    <button onClick={handleLike} className={styles.button}>👍 Like</button>
    </div>
  );
}
