import React, { useState, useEffect } from 'react';
import { Provider } from '../types';
import { Loader2 } from 'lucide-react';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: Provider) => Promise<void>;
  initialData?: Provider | null;
}

const ProviderModal = ({ isOpen, onClose, onSave, initialData }: ProviderModalProps) => {
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setContactInfo(initialData.contactInfo || '');
      setBankDetails(initialData.bankDetails || '');
    } else {
      setName('');
      setContactInfo('');
      setBankDetails('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        id: initialData?.id || `PROV-${Date.now()}`,
        name,
        contactInfo,
        bankDetails
      });
      // Do not close here, let parent handle it or close manually if needed, 
      // but usually modal closes on success. Parent passes onClose.
    } catch (error: any) {
      console.error(error);
      alert(`Failed to save provider: ${error.message || "Please check your connection or input."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-xl font-bold mb-4">{initialData ? 'Edit Provider' : 'Add New Provider'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Provider Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Acme Pharma Supply"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Info</label>
            <input 
              type="text" 
              value={contactInfo} 
              onChange={e => setContactInfo(e.target.value)} 
              className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" 
              placeholder="Phone, Email, Address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bank Details</label>
            <input 
              type="text" 
              value={bankDetails} 
              onChange={e => setBankDetails(e.target.value)} 
              className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" 
              placeholder="IBAN, Account Number"
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="animate-spin" size={16} />}
              Save Provider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProviderModal;