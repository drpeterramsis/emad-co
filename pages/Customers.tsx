
import React, { useState, useEffect } from 'react';
import { getCustomers, addCustomer } from '../utils/storage';
import { Customer, CustomerType } from '../types';
import { Users, Plus, MapPin, Search, Loader2 } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CustomerType>(CustomerType.PHARMACY);
  const [newAddress, setNewAddress] = useState('');
  const [newDiscount, setNewDiscount] = useState('0');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const data = await getCustomers();
    setCustomers(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer: Customer = {
      id: `CUST-${Date.now()}`,
      name: newName,
      type: newType,
      address: newAddress,
      defaultDiscount: parseFloat(newDiscount) || 0
    };

    await addCustomer(customer);
    await fetchCustomers();
    setShowModal(false);
    
    // Reset form
    setNewName('');
    setNewType(CustomerType.PHARMACY);
    setNewAddress('');
    setNewDiscount('0');
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Customers</h2>
          <p className="text-slate-500">Manage your client base</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none w-64"
            />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-teal-800 flex items-center gap-2 shadow-lg shadow-teal-700/30"
          >
            <Plus size={18} /> Add Customer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium text-slate-600">Name</th>
              <th className="p-4 font-medium text-slate-600">Type</th>
              <th className="p-4 font-medium text-slate-600">Address</th>
              <th className="p-4 font-medium text-slate-600">Default Discount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
               <tr><td colSpan={4} className="p-8 text-center text-slate-400">No customers found.</td></tr>
            ) : (
              filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <Users size={16} />
                    </div>
                    {customer.name}
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full border border-slate-200">
                      {customer.type}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">
                     <div className="flex items-center gap-1">
                        {customer.address && <MapPin size={14} className="text-slate-400" />}
                        {customer.address || '-'}
                     </div>
                  </td>
                  <td className="p-4 text-slate-600 font-mono">
                    {customer.defaultDiscount ? `${customer.defaultDiscount}%` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-slate-800">New Customer</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                <input 
                  type="text" 
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Al-Hayat Pharmacy"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                   <select 
                     value={newType}
                     onChange={(e) => setNewType(e.target.value as CustomerType)}
                     className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                   >
                     {Object.values(CustomerType).map(type => (
                       <option key={type} value={type}>{type}</option>
                     ))}
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Discount (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input 
                  type="text" 
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Street address, City"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-800 shadow"
                >
                  Save Customer
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
