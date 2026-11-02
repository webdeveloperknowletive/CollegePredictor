
type CollegePredictorLogoProps = {
  size?: number;
  className?: string;
};

export default function CollegePredictorLogo({
  size = 48,
  className = "",
}: CollegePredictorLogoProps) {
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center
        rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700
        shadow-md ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="College Predictor logo"
    >
      <svg
        width={size * 0.76}
        height={size * 0.76}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* C */}
        <path
          d="M22 12H16C10.5 12 7 16.5 7 24S10.5 36 16 36H22"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* P */}
        <path
          d="M26 36V12H34C40 12 42 15.5 42 20S40 28 34 28H26"
          stroke="#5EEAD4"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
