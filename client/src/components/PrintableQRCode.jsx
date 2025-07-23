import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@mui/material";

const PrintableQRCode = ({ token }) => {
  const canvasRef = useRef();

  const handlePrint = () => {
    const canvas = canvasRef.current.querySelector("canvas");
    const dataUrl = canvas.toDataURL(); // Convert canvas to image

    const printWindow = window.open("", "_blank", "width=600,height=900");

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code</title>
            <style>
              body {
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="QR Code" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <>
      <div ref={canvasRef}>
        <QRCodeCanvas
          value={JSON.stringify({
            tokenId: token._id,
            tokenNumber: token.tokenNumber,
            patientName: token.patientName,
          })}
          size={128}
        />
      </div>
      <Button
        variant="outlined"
        size="small"
        sx={{ mt: 1 }}
        onClick={handlePrint}
      >
        Print QR Code
      </Button>
    </>
  );
};

export default PrintableQRCode;
