interface WelcomeScreenProps {
  onOpenFile: () => void;
}

export function WelcomeScreen({ onOpenFile }: WelcomeScreenProps) {
  return (
    <div className="welcome">
      <h1>AwapiPDF</h1>
      <p>Lightweight, smart, yours.</p>
      <button className="welcome-btn" onClick={onOpenFile}>
        Open a PDF
      </button>
      <p>or drag and drop a file here</p>
    </div>
  );
}
