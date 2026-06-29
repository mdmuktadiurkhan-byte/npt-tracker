"use client";

import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, age }),
    });

    const data = await res.json();
    console.log(data);

    alert("Data sent to MongoDB!");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Send Data to MongoDB</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br /><br />

        <input
          type="number"
          placeholder="Enter Age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
        <br /><br />

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}