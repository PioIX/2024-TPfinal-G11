"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Comments from '../../../components/Comments'; // Asegúrate de tener este componente
import styles from '../../../styles/PinDetail.module.css'; // Archivo CSS para estilos específicos

const PinDetail = () => {
  const { id } = useParams(); // Obtener el ID del pin desde la URL
  const [pin, setPin] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchPinDetails();
    }
  }, [id]);

  const fetchPinDetails = async () => {
    try {
      const res = await fetch(`http://localhost:4000/pins/${id}`);
      if (!res.ok) throw new Error('Error al obtener el pin');
      const data = await res.json();
      setPin(data);
    } catch (error) {
      console.error('Error al obtener el pin:', error);
    }
  };

  if (!pin) return <p>Cargando...</p>; // Mostrar mientras se cargan los datos

  return (
    <div className={styles.container}>
      <div className={styles.pinDetail}>
        <img src={pin.image_url} alt={pin.title} className={styles.image} />
        <h2>{pin.title}</h2>
        <p>{pin.likes} ❤️</p>
      </div>

      <Comments pinId={id} /> {/* Componente de comentarios */}
      <button onClick={() => router.back()} className={styles.backButton}>
        Volver
      </button>
    </div>
  );
};

export default PinDetail;
