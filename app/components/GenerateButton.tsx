interface GenerateButtonProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function GenerateButton({
  text,
  onClick,
  disabled,
}: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${
        disabled ? "bg-emerald-300" : "bg-emerald-400 hover:bg-emerald-500"
      } text-white font-medium w-40 py-2 rounded-xl shadow-lg transition-all duration-300 active:scale-95`}
    >
      {text}
    </button>
  );
}
