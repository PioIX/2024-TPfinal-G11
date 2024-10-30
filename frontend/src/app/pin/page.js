"use client"
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from '../../styles/Home.module.css'; // Asegúrate de ajustar la ruta según sea necesario

const PinPage = () => {
  const router = useRouter();
  const { id } = router.query; // Obtener el ID del pin desde la URL
  const [pin, setPin] = useState(null);

  useEffect(() => {
    if (id) {
      fetchPin();
    }
  }, [id]);

  const fetchPin = async () => {
    try {
      const res = await fetch(`http://localhost:4000/pins/${id}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Error al cargar el pin');
      const data = await res.json();
      setPin(data);
    } catch (error) {
      console.error('Error al cargar el pin:', error);
    }
  };

  if (!pin) return <p>Cargando...</p>;

  return (
    <div className={styles.container}>
      <h1>{pin.title}</h1>
      <img src={pin.image_url} alt={pin.title} className={styles.image} />
      <p>{pin.likes} Likes ❤️</p>
      {}
    </div>
  );
};

export default PinPage;
