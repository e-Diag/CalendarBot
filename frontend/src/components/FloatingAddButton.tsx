import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingAddButtonProps {
  onClick: () => void;
}

export default function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-blue-800 to-blue-500 rounded-full shadow-lg flex items-center justify-center z-50"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Plus size={28} className="text-white" strokeWidth={2.5} />
    </motion.button>
  );
}
