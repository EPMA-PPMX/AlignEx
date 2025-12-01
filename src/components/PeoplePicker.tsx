import { useState, useEffect, useRef } from 'react';
import { Search, X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Resource {
  id: string;
  display_name: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface PeoplePickerProps {
  value: string;
  onChange: (resourceId: string, displayName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function PeoplePicker({ value, onChange, placeholder = 'Select a person...', disabled = false }: PeoplePickerProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    if (value && resources.length > 0 && !selectedResource) {
      const resource = resources.find(r => r.id === value);
      if (resource) {
        setSelectedResource(resource);
        setSearchTerm(resource.display_name);
      }
    }
  }, [value, resources, selectedResource]);

  useEffect(() => {
    console.log('PeoplePicker: isOpen=', isOpen, 'filteredResources=', filteredResources.length, 'loading=', loading);
  }, [isOpen, filteredResources, loading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedResource) {
          setSearchTerm(selectedResource.display_name);
        } else {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedResource]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredResources(resources);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = resources.filter(resource =>
        resource.display_name.toLowerCase().includes(term) ||
        resource.first_name.toLowerCase().includes(term) ||
        resource.last_name.toLowerCase().includes(term) ||
        resource.email.toLowerCase().includes(term)
      );
      setFilteredResources(filtered);
    }
  }, [searchTerm, resources]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resources')
        .select('id, display_name, email, first_name, last_name')
        .eq('resource_type', 'person')
        .eq('status', 'active')
        .order('display_name');

      if (error) throw error;
      console.log('PeoplePicker: Fetched resources:', data?.length || 0);
      setResources(data || []);
      setFilteredResources(data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (resource: Resource) => {
    setSelectedResource(resource);
    setSearchTerm(resource.display_name);
    setIsOpen(false);
    onChange(resource.id, resource.display_name);
  };

  const handleClear = () => {
    setSelectedResource(null);
    setSearchTerm('');
    onChange('', '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('PeoplePicker: Input changed:', newValue);
    setSearchTerm(newValue);
    setIsOpen(true);

    if (newValue.trim() === '') {
      setSelectedResource(null);
      onChange('', '');
    }
  };

  const handleInputFocus = () => {
    console.log('PeoplePicker: Input focused, opening dropdown');
    setIsOpen(true);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {selectedResource ? (
            <User className="w-4 h-4 text-blue-600" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        {selectedResource && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredResources.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No people found{searchTerm && ` for "${searchTerm}"`}
              <div className="text-xs text-gray-400 mt-1">
                {resources.length} total people available
              </div>
            </div>
          ) : (
            <ul className="py-1">
              {filteredResources.map((resource) => (
                <li key={resource.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(resource)}
                    className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 transition-colors ${
                      selectedResource?.id === resource.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {resource.first_name?.[0]}{resource.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{resource.display_name}</div>
                      <div className="text-sm text-gray-500 truncate">{resource.email}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
