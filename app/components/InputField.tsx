interface InputFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}

export default function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: InputFieldProps) {
  return (
    <div className="flex flex-col w-full max-w-md gap-2 m-6">
      <label className="text-lg self-center">{label}</label>
      <input
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="w-full p-3 bg-amber-100 text-gray-900 rounded-3xl shadow-md outline-none focus:ring-4 focus:ring-amber-400 transition-all"
      />
    </div>
  );
}
