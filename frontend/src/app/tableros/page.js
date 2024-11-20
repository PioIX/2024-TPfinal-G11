"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';  
import styles from "../styles/Tableros.module.css";


const Atras = () => {
  router.push('../home');
};
function Boards() {
  const [groupedPins, setGroupedPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const response = await fetch('http://localhost:4000/boards', {
          method: 'GET',
        });
        if (!response.ok) {
          throw new Error('Error al cargar los tableros');
        }
        const data = await response.json();
        setGroupedPins(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };


   const handleLogout = () => {
      router.push('/inicio/home');
    };

    fetchBoards();
  }, []);

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className={styles.div}>
      <a href="../home">
      <img className={styles["icono-volver"]} src="flecha_izquierda.png" alt="Volver atras" />
      </a>
      {groupedPins.map((categoryData) => (
        <div key={categoryData.category} className={styles.categorySection}>
          <h2 className={styles.categoryTitle}>{categoryData.category}</h2>
          <div className={styles.pinContainer}>
            {categoryData.pins.map((pin) => (
              <div key={pin.id} className={styles.pin}>
                <img
                  src={pin.image_url}
                  alt={pin.title}
                  className={styles.pinImage}
                />
                <h3 className={styles.pinTitle}>{pin.title}</h3>
                <p className={styles.pinDescription}>{pin.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

  );
}

export default Boards;
