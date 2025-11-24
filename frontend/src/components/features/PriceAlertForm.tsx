import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const alertSchema = z.object({
  productIdentifier: z.string().min(1, 'Product URL or identifier is required'),
  thresholdPrice: z.number().positive('Price must be positive'),
  productName: z.string().optional(),
});

type AlertFormData = z.infer<typeof alertSchema>;

interface PriceAlertFormProps {
  onSuccess?: () => void;
}

/**
 * Price alert creation form
 */
export function PriceAlertForm({ onSuccess }: PriceAlertFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
  });

  const onSubmit = async (data: AlertFormData) => {
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to create price alerts');
        return;
      }

      const response = await fetch('http://localhost:3001/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create alert');
      }

      toast.success('Price alert created successfully!');
      reset();
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create price alert');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="productIdentifier"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Product URL or Identifier
        </label>
        <input
          id="productIdentifier"
          type="text"
          {...register('productIdentifier')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          placeholder="https://example.com/product or Product SKU"
        />
        {errors.productIdentifier && (
          <p className="mt-1 text-sm text-red-600">
            {errors.productIdentifier.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="productName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Product Name (Optional)
        </label>
        <input
          id="productName"
          type="text"
          {...register('productName')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          placeholder="Product name"
        />
      </div>

      <div>
        <label
          htmlFor="thresholdPrice"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Alert When Price Drops Below
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            id="thresholdPrice"
            type="number"
            step="0.01"
            {...register('thresholdPrice', { valueAsNumber: true })}
            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="0.00"
          />
        </div>
        {errors.thresholdPrice && (
          <p className="mt-1 text-sm text-red-600">
            {errors.thresholdPrice.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Creating Alert...' : 'Create Price Alert'}
      </button>
    </form>
  );
}

export default PriceAlertForm;

