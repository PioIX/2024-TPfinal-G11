
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
      setPin(data);
    } catch (error) {
      console.error('Error al cargar el pin:', error);
    }
  };

  if (!pin) return <div>Cargando...</div>;

  return (
    <div className={styles.pinContainer}>
      <img src={pin.image_url} alt={pin.title} className={styles.image} />
      <h1>{pin.title}</h1>
      <p>{pin.description}</p>
      <p>{pin.likes} Likes❤️</p>
    </div>
  );
}
