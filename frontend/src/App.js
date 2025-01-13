import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState([]);
  const [error, setError] = useState("");

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Handle file upload
  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post('http://localhost:3001/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        setReport(response.data.report);
        setError('');
    } catch (err) {
        console.error('Upload error:', err);
        setError('Error uploading file. Please try again.');
    }
};


  // Handle report download
  const handleDownload = async () => {
    try {
      const response = await axios.post("http://localhost:3001/report/download", { report }, {
        responseType: "blob", // Ensures the file is treated as binary data
      });

      // Create a download link for the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "restock_report.csv");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      setError("Error downloading the report.");
      console.error(err);
    }
  };

  return (
    <div className="App">
      <h1>Inventory Restocking Tool</h1>

      {/* File Upload */}
      <div>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <button onClick={handleUpload}>Upload CSV</button>
      </div>
      {error && <p className="error">{error}</p>}

      {/* Report Table */}
      {report.length > 0 && (
    <div>
        <h2>Restocking Report</h2>
        <table>
            <thead>
                <tr>
                    <th>EAN</th>
                    <th>Title</th>
                    <th>Free Stock</th>
                    <th>Forecast</th>
                    <th>Restock Quantity</th>
                    <th>Logistic Type</th>
                </tr>
            </thead>
            <tbody>
                {report.map((item, index) => (
                    <tr key={index}>
                        <td>{item.EAN}</td>
                        <td>{item.Title}</td>
                        <td>{item.FreeStock}</td>
                        <td>{item.Forecast}</td>
                        <td>{item.RestockQuantity}</td>
                        <td>{item.LogisticType}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <button onClick={handleDownload}>Download Report</button>
    </div>
)}

    </div>
  );
};

export default App;
