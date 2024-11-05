"use client"

import { useState } from 'react';
import styles from "../../styles/Authentication.module.css";

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit() {
    console.log(form)
    const res = await fetch('http://localhost:4000/login', {
      method: 'POST',
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify(form)
    });

    const data = await res.json();
    console.log(data);
    if (res.status == 401) {
      console.log("contraseña o usuario invalido")
    }
    else{
      localStorage.setItem('userID', data.id); //localStorage.getItem("userID")
      location.href = '/home'
    }

  }
  function irARegister() {
    location.href = "/inicio/register"
  }

  return (
    <>
      {}
      <body className={styles.body}>
        <div className={styles.container}>
          <h2 className={styles.title}>Te damos la bienvenida a ICONIC</h2>
          <input className={styles.input} name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <input className={styles.input} name="password" type="password" placeholder="Contraseña" onChange={handleChange} required />
          <button className={styles.button} onClick={handleSubmit} type="button">Iniciar sesión</button>
          <button className={styles.button} onClick={irARegister} type="button">Registrate</button>
        </div>

      </body>
    </>

  );
}
