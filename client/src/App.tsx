import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState<string>("Loading...");

  useEffect(() => {
    fetch("http://localhost:3000/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("Error connecting to server"));
  }, []);

  return (
    <div>
      <h1>Ticket Manager</h1>
      <p>Server status: {status}</p>
    </div>
  );
}

export default App;
