export function AboutPage() {
  return (
    <div className="about-page">
      <h1 className="about-title">About EssayAI</h1>
      <p className="about-subtitle">
        EssayAI is an intelligent writing assistant developed for the AI-Powered
        Essay Evaluation & Writing Assistant capstone project.
      </p>

      <div className="about-section">
        <h3>How it works</h3>
        <p>
          This application uses a prompt-aware ensemble trained on the
          Automated Student Assessment Prize (ASAP 2.0) dataset. It combines
          essay text features, TF-IDF text signals, and the selected training
          prompt to estimate a holistic score. The estimate is a writing aid,
          not an official grade.
        </p>
      </div>

      <div className="about-section">
        <h3>Evaluation Dimensions</h3>
        <p>
          While the core ML model provides an overall holistic score, the
          individual dimensions (Grammar, Vocabulary, Coherence, etc.) are
          derived from specific NLP metrics extracted during the evaluation
          process. This allows us to provide targeted, actionable feedback rather
          than just a single number.
        </p>
        <ul style={{ marginTop: '12px' }}>
          <li>Vocabulary richness is measured using type-token ratios.</li>
          <li>Readability uses Flesch Reading Ease and Kincaid Grade level.</li>
          <li>Sentence structure is analyzed via sentence length and variance.</li>
        </ul>
      </div>

      <div className="about-section">
        <h3>Technology Stack</h3>
        <div style={{ marginTop: '12px' }}>
          <span className="tech-badge">React</span>
          <span className="tech-badge">TypeScript</span>
          <span className="tech-badge">Vite</span>
          <span className="tech-badge">FastAPI</span>
          <span className="tech-badge">Python</span>
          <span className="tech-badge">Scikit-Learn</span>
          <span className="tech-badge">NLTK</span>
        </div>
      </div>
    </div>
  );
}
