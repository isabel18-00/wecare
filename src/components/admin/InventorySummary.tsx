'use client';

import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  min_quantity: number;
  unit: string;
  updated_at: string;
}

export function InventorySummary() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .lte('quantity', 10) // Show items with quantity <= 10
          .order('quantity', { ascending: true })
          .limit(5);

        if (error) throw error;
        setInventory(data || []);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('inventory')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        fetchInventory
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Low Stock Items
        </h3>
        <Link
          href="/dashboard/admin/inventory"
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="-ml-1 mr-1 h-4 w-4" />
          Add Item
        </Link>
      </div>
      <div className="divide-y divide-gray-200">
        {inventory.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Item
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Quantity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/dashboard/admin/inventory/${item.id}`)
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-sm text-gray-500">
                        {item.description.length > 30
                          ? `${item.description.substring(0, 30)}...`
                          : item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="text-xs text-gray-500">
                      Min: {item.min_quantity}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.quantity <= item.min_quantity
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {item.quantity <= item.min_quantity ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Critical
                        </>
                      ) : (
                        'Low Stock'
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No low stock items
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              All inventory items are well stocked.
            </p>
          </div>
        )}
      </div>
      {inventory.length > 0 && (
        <div className="bg-gray-50 px-4 py-3 text-right">
          <Link
            href="/dashboard/admin/inventory"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View all inventory
          </Link>
        </div>
      )}
    </div>
  );
}
