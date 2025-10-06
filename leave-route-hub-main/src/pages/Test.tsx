const Test = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue' }}>
      <h1>Test Component</h1>
      <p>If you can see this, React is working!</p>
      <p>API Base URL: {import.meta.env.VITE_API_BASE_URL}</p>
      <p>MongoDB URI: {import.meta.env.VITE_MONGODB_URI}</p>
    </div>
  );
};

export default Test;
