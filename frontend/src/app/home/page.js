"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from "../styles/Home.module.css";

export default function Home() {
  const [pins, setPins] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchPins();
  }, []);

  const fetchPins = async () => {
    try {
      const res = await fetch('http://localhost:4000/pins');
      if (!res.ok) throw new Error('Error al cargar pins');
      const data = await res.json();
      setPins(data);
    } catch (error) {
      console.error('Error al cargar pins:', error);
    }
  };

  const handlePinClick = (id) => {
    router.push(`/pin/${id}`); // Navegar a la página de detalle del pin
  };

  return (
    <div className={styles.pinContainer}>
      {pins.map((pin) => (
        <div 
          key={pin.id} 
          className={styles.pin} 
          onClick={() => handlePinClick(pin.id)}
        >
          <img src={pin.image_url} alt={pin.title} className={styles.image} />
          <h3>{pin.title}</h3>
          <p>{pin.likes} ❤️</p>
        </div>
      ))}
    </div>
  );
}
