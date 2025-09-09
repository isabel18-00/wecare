'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type Vaccine = {
  id: string;
  name: string;
  description: string;
  manufacturer: string;
  lot_number: string;
  expiry_date: string;
  quantity: number;
  min_quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  created_at: string;
  updated_at: string;
};

export default function InventoryPage() {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Vaccine>>({
    name: '',
    description: '',
    manufacturer: '',
    lot_number: '',
    expiry_date: '',
    quantity: 0,
    min_quantity: 10,
  });
  
  const supabase = createClient();
  const router = useRouter();

  // Check if user is admin
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      // In a real app, you would check the user's role here
      // For now, we'll just check if the user is logged in
    };

    checkUser();
  }, [router, supabase]);

  // Fetch vaccine inventory
  useEffect(() => {
    const fetchVaccines = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vaccines')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        
        // Update status based on quantity
        const updatedVaccines = data.map(vaccine => ({
          ...vaccine,
          status: getVaccineStatus(vaccine.quantity, vaccine.min_quantity)
        }));
        
        setVaccines(updatedVaccines);
      } catch (error) {
        console.error('Error fetching vaccine inventory:', error);
        toast.error('Failed to load vaccine inventory');
      } finally {
        setLoading(false);
      }
    };

    fetchVaccines();

    // Set up real-time subscription
    const channel = supabase
      .channel('vaccine-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vaccines',
        },
        () => {
          // Refresh the list when there are changes
          fetchVaccines();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getVaccineStatus = (quantity: number, minQuantity: number) => {
    if (quantity <= 0) return 'out_of_stock';
    if (quantity <= minQuantity) return 'low_stock';
    return 'in_stock';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'min_quantity' ? parseInt(value) || 0 : value,
    }));
  };

  const handleAddVaccine = () => {
    setFormData({
      name: '',
      description: '',
      manufacturer: '',
      lot_number: '',
      expiry_date: '',
      quantity: 0,
      min_quantity: 10,
    });
    setEditingId(null);
    setIsAdding(true);
  };

  const handleEditVaccine = (vaccine: Vaccine) => {
    setFormData({
      name: vaccine.name,
      description: vaccine.description,
      manufacturer: vaccine.manufacturer,
      lot_number: vaccine.lot_number,
      expiry_date: vaccine.expiry_date.split('T')[0], // Format date for input
      quantity: vaccine.quantity,
      min_quantity: vaccine.min_quantity,
    });
    setEditingId(vaccine.id);
    setIsAdding(true);
  };

  const handleDeleteVaccine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vaccine?')) return;

    try {
      const { error } = await supabase
        .from('vaccines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Vaccine deleted successfully');
      setVaccines(vaccines.filter(vaccine => vaccine.id !== id));
    } catch (error) {
      console.error('Error deleting vaccine:', error);
      toast.error('Failed to delete vaccine');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { name, description, manufacturer, lot_number, expiry_date, quantity, min_quantity } = formData;
      
      if (!name || !manufacturer || !lot_number || !expiry_date || quantity === undefined || min_quantity === undefined) {
        toast.error('Please fill in all required fields');
        return;
      }

      const vaccineData = {
        name,
        description,
        manufacturer,
        lot_number,
        expiry_date: new Date(expiry_date).toISOString(),
        quantity,
        min_quantity,
        status: getVaccineStatus(quantity, min_quantity),
      };

      if (editingId) {
        // Update existing vaccine
        const { error } = await supabase
          .from('vaccines')
          .update(vaccineData)
          .eq('id', editingId);

        if (error) throw error;

        toast.success('Vaccine updated successfully');
      } else {
        // Add new vaccine
        const { error } = await supabase
          .from('vaccines')
          .insert([vaccineData]);

        if (error) throw error;

        toast.success('Vaccine added successfully');
      }

      // Reset form and refresh the list
      setIsAdding(false);
      setFormData({
        name: '',
        description: '',
        manufacturer: '',
        lot_number: '',
        expiry_date: '',
        quantity: 0,
        min_quantity: 10,
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving vaccine:', error);
      toast.error(`Failed to ${editingId ? 'update' : 'add'} vaccine`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            In Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Low Stock
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Vaccine Inventory</h1>
          <p className="text-muted-foreground">
            Manage vaccine stock and monitor inventory levels
          </p>
        </div>
        <Button onClick={handleAddVaccine}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vaccine
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Vaccine' : 'Add New Vaccine'}</CardTitle>
            <CardDescription>
              {editingId ? 'Update the vaccine details' : 'Enter the details for the new vaccine'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Vaccine Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Anti-Rabies Vaccine"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="manufacturer" className="block text-sm font-medium mb-1">
                    Manufacturer <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Sanofi Pasteur"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lot_number" className="block text-sm font-medium mb-1">
                    Lot Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="lot_number"
                    name="lot_number"
                    value={formData.lot_number || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., ARV2023001"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="expiry_date" className="block text-sm font-medium mb-1">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="expiry_date"
                    name="expiry_date"
                    type="date"
                    value={formData.expiry_date || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                    Current Quantity <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="min_quantity" className="block text-sm font-medium mb-1">
                    Minimum Quantity <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="min_quantity"
                    name="min_quantity"
                    type="number"
                    min="0"
                    value={formData.min_quantity || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="Enter any additional information about this vaccine"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? 'Update Vaccine' : 'Add Vaccine'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vaccine Inventory</CardTitle>
          <CardDescription>
            Current stock levels and status of all vaccines
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <Table>
              <TableCaption>
                {vaccines.length === 0 ? 'No vaccines found. Add one to get started.' : 'A list of all vaccines in inventory.'}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaccine</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaccines.map((vaccine) => (
                  <TableRow key={vaccine.id}>
                    <TableCell className="font-medium">{vaccine.name}</TableCell>
                    <TableCell>{vaccine.manufacturer}</TableCell>
                    <TableCell>{vaccine.lot_number}</TableCell>
                    <TableCell>{format(new Date(vaccine.expiry_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <span className={vaccine.quantity <= vaccine.min_quantity ? 'font-bold' : ''}>
                        {vaccine.quantity} {vaccine.quantity === 1 ? 'dose' : 'doses'}
                        {vaccine.quantity <= vaccine.min_quantity && (
                          <span className="ml-1 text-xs text-yellow-600">(min: {vaccine.min_quantity})</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(vaccine.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditVaccine(vaccine)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVaccine(vaccine.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
