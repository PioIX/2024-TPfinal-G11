"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Navegación
import styles from "../styles/Authentication.module.css"

export default function Home() {
  const [pins, setPins] = useState([]);
  const router = useRouter(); // Redirección al login si se cierra sesión

  // Obtener pins al cargar el componente
  useEffect(() => {
    async function fetchPins() {
      const res = await fetch('http://localhost:4000/pins');
      const data = await res.json();
      setPins(data);
    }

    fetchPins();
  }, []);

  const handleLike = async (pinId) => {
    const res = await fetch(`http://localhost:4000/pins/${pinId}/like`, {
      method: 'POST',
    });

    if (res.ok) {
      setPins((prevPins) =>
        prevPins.map((pin) =>
          pin.id === pinId ? { ...pin, likes: pin.likes + 1 } : pin
        )
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); // Eliminar token de sesión
    router.push('/login'); // Redirigir al login
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Inicio</h2>
      <button className={styles.button} onClick={handleLogout}>
        Cerrar Sesión
      </button>

      <div className={styles.pinContainer}>
        {pins.map((pin) => (
          <div key={pin.id} className={styles.pin}>
            <img src={pin.image_url} alt={pin.title} className={styles.image} />
            <h3 className={styles.pinTitle}>{pin.title}</h3>
            <p>{pin.likes} Likes</p>
            <button className={styles.button} onClick={() => handleLike(pin.id)}>
              Like
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

