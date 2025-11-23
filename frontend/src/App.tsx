import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ShopSavr™
        </h1>
        <p className="text-gray-600 mb-8">
          Intelligent Coupon & Deal Finder
        </p>
        <button
          onClick={() => setCount(count + 1)}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Count: {count}
        </button>
      </div>
    </div>
  );
}

export default App;

