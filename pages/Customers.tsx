import React, { useState, useEffect } from 'react';
import { getCustomers, addCustomer, deleteCustomer, updateCustomer } from '../utils/storage';
import { Customer, CustomerType } from '../types';
import { Users, Plus, MapPin, Search, Loader2, Trash2, Map, Edit2 } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CustomerType>(CustomerType.PHARMACY);
  const [newAddress, setNewAddress] = useState('');
  const [newBrick, setNewBrick] = useState('');
  const [newDiscount, setNewDiscount] = useState('0');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const data = await getCustomers();
    // Sort customers alphabetically
    const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
    setCustomers(sortedData);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setNewName('');
    setNewType(CustomerType.PHARMACY);
    setNewAddress('');
    setNewBrick('');
    setNewDiscount('0');
    setErrorMsg('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingId(customer.id);
    setNewName(customer.name);
    setNewType(customer.type);
    setNewAddress(customer.address || '');
    setNewBrick(customer.brick || '');
    setNewDiscount(customer.defaultDiscount?.toString() || '0');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (editingId) {
        // Update existing customer
        const updatedCustomer: Customer = {
          id: editingId,
          name: newName,
          type: newType,
          address: newAddress,
          brick: newBrick,
          defaultDiscount: parseFloat(newDiscount) || 0
        };
        await updateCustomer(updatedCustomer);
      } else {
        // Add new customer
        const customer: Customer = {
          id: `CUST-${Date.now()}`,
          name: newName,
          type: newType,
          address: newAddress,
          brick: newBrick,
          defaultDiscount: parseFloat(newDiscount) || 0
        };
        await addCustomer(customer);
      }

      await fetchCustomers();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error("Error saving customer:", err);
      // More specific error message if possible
      const message = err.message || "Failed to save customer. Please check your connection and try again.";
      setErrorMsg(message);
    }
  };

  const handleDelete = async (customerId: string, customerName: string) => {
    if (window.confirm(`Are you sure you want to delete ${customerName}?`)) {
      if (window.confirm(`WARNING: This will permanently delete ${customerName} AND ALL associated orders and transactions. This action cannot be undone. Are you absolutely sure?`)) {
        try {
          setLoading(true);
          await deleteCustomer(customerId);
          await fetchCustomers();
        } catch (err) {
          console.error("Error deleting customer:", err);
          alert("Failed to delete customer. Please try again.");
          setLoading(false);
        }
      }
    }
  }

  const getCustomerTypeColor = (type: CustomerType) => {
    switch (type) {
      case CustomerType.PHARMACY:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case CustomerType.STORE:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case CustomerType.HCP:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case CustomerType.DIRECT:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.type.toLowerCase().includes(search.toLowerCase()) ||
    (c.brick && c.brick.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Customers</h2>
          <p className="text-slate-500 text-xs md:text-sm">Manage your client base ({filteredCustomers.length} records)</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-full text-sm"
            />
          </div>
          <button 
            onClick={handleOpenAddModal}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-teal-800 flex items-center justify-center gap-2 shadow-lg shadow-teal-700/30 whitespace-nowrap text-sm"
          >
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 font-medium text-slate-600">Name</th>
                <th className="p-3 font-medium text-slate-600">Type</th>
                <th className="p-3 font-medium text-slate-600">Brick / Area</th>
                <th className="p-3 font-medium text-slate-600">Address</th>
                <th className="p-3 font-medium text-slate-600">Default Discount</th>
                <th className="p-3 font-medium text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                 <tr><td colSpan={6} className="p-6 text-center text-slate-400">No customers found.</td></tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-800 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Users size={14} />
                      </div>
                      <span className="whitespace-nowrap">{customer.name}</span>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap font-medium ${getCustomerTypeColor(customer.type)}`}>
                        {customer.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                       <div className="flex items-center gap-1">
                          {customer.brick && <Map size={12} className="text-slate-400" />}
                          {customer.brick || '-'}
                       </div>
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                       <div className="flex items-center gap-1">
                          {customer.address && <MapPin size={12} className="text-slate-400" />}
                          {customer.address || '-'}
                       </div>
                    </td>
                    <td className="p-3 text-slate-600 font-mono whitespace-nowrap">
                      {customer.defaultDiscount ? `${customer.defaultDiscount}%` : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(customer)}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1.5 rounded-full hover:bg-blue-50"
                          title="Edit Customer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id, customer.name)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50"
                          title="Delete Customer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-slate-800">
              {editingId ? 'Edit Customer' : 'New Customer'}
            </h3>
            {errorMsg && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Customer Name</label>
                <input 
                  type="text" 
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                  placeholder="e.g. Al-Hayat Pharmacy"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                   <select 
                     value={newType}
                     onChange={(e) => setNewType(e.target.value as CustomerType)}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-sm"
                   >
                     {Object.values(CustomerType).map(type => (
                       <option key={type} value={type}>{type}</option>
                     ))}
                   </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Default Discount (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Brick / Area</label>
                <input 
                  type="text" 
                  value={newBrick}
                  onChange={(e) => setNewBrick(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                  placeholder="e.g. Maadi, Downtown, Zone A"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <input 
                  type="text" 
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                  placeholder="Street address, City"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-teal-800 shadow text-sm"
                >
                  {editingId ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;