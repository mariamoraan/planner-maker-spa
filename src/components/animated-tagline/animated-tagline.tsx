import "./animated-tagline.scss";

interface Props {
    words: string[];
}

export const AnimatedTagline: React.FC<Props> = ({ words }) => {
    const totalDuration = `${words.length * 2}s`;
    return (
      <div className="animated-tagline">
        <div className="animated-tagline__line">
          <span className="animated-tagline__static">Your</span>
          <span className="animated-tagline__slot">
            {/* Palabra invisible que empuja el ancho del slot */}
            <span className="animated-tagline__sizer" aria-hidden="true">
              {words.reduce((a, b) => (a.length > b.length ? a : b))}
            </span>
            {words.map((word, wordIndex) => (
              <span
                key={word}
                className="animated-tagline__word"
                style={{
                    animationDelay: `${wordIndex * 2}s`,
                    animationDuration: totalDuration,
                }}
              >
                {word}
              </span>
            ))}
          </span>
        </div>
      </div>
    );
  };