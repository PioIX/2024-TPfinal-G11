"use client";

import { useState } from 'react';
import styles from "../../styles/Authentication.module.css";

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit() {
    console.log(form);
    const res = await fetch('http://localhost:4000/register', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    console.log(data);

    /*
    if (res.ok) {
      alert('Registro exitoso. Por favor inicia sesión.');
    } else {
      alert(data.error || 'Error al registrarse');
    }
    */
  }
  function irALogin() {
    location.href = "/inicio/login"
  }
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Registrarse</h2>
      <input
        className={styles.input}
        name="username"
        type="text"
        placeholder="Nombre de usuario"
        onChange={handleChange}
        required
      />
      <input
        className={styles.input}
        name="email"
        type="email"
        placeholder="Email"
        onChange={handleChange}
        required
      />
      <input
        className={styles.input}
        name="password"
        type="password"
        placeholder="Contraseña"
        onChange={handleChange}
        required
      />
      <button className={styles.button} onClick={handleSubmit} type="button"> Registrarse
      </button>
      <button className={styles.button} onClick={irALogin} type="button">Iniciar sesión</button>
    </div>
  );
}
