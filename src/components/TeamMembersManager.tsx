import React, { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TeamMember {
  id: string;
  project_id: string;
  member_name: string;
  member_email: string;
  role: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string | null;
}

interface TeamMembersManagerProps {
  projectId: string;
  teamMembers: TeamMember[];
  onMembersUpdated: () => void;
}

const SAMPLE_AD_USERS = [
  { name: 'John Doe', email: 'john.doe@company.com' },
  { name: 'Jane Smith', email: 'jane.smith@company.com' },
  { name: 'Bob Johnson', email: 'bob.johnson@company.com' },
  { name: 'Alice Williams', email: 'alice.williams@company.com' },
  { name: 'Charlie Brown', email: 'charlie.brown@company.com' },
  { name: 'Diana Prince', email: 'diana.prince@company.com' },
  { name: 'Edward Norton', email: 'edward.norton@company.com' },
  { name: 'Fiona Green', email: 'fiona.green@company.com' },
  { name: 'George Miller', email: 'george.miller@company.com' },
  { name: 'Hannah Lee', email: 'hannah.lee@company.com' },
];

export default function TeamMembersManager({ projectId, teamMembers, onMembersUpdated }: TeamMembersManagerProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ name: string; email: string } | null>(null);
  const [memberForm, setMemberForm] = useState({
    role: '',
    allocation_percentage: 100,
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = SAMPLE_AD_USERS.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      alert('Please select a team member');
      return;
    }

    const memberExists = teamMembers.some(
      member => member.member_email === selectedUser.email
    );

    if (memberExists) {
      alert('This team member is already added to the project');
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('team_members')
        .insert({
          project_id: projectId,
          member_name: selectedUser.name,
          member_email: selectedUser.email,
          role: memberForm.role,
          allocation_percentage: memberForm.allocation_percentage,
          start_date: memberForm.start_date,
          end_date: memberForm.end_date || null
        });

      if (error) throw error;

      setShowAddMember(false);
      setSelectedUser(null);
      setSearchQuery('');
      setMemberForm({
        role: '',
        allocation_percentage: 100,
        start_date: new Date().toISOString().split('T')[0],
        end_date: ''
      });
      onMembersUpdated();
    } catch (error: any) {
      console.error('Error adding team member:', error);
      alert(`Error adding team member: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      onMembersUpdated();
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      alert(`Error deleting team member: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Members
        </h3>
        <button
          onClick={() => setShowAddMember(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Allocation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamMembers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No team members added yet. Click "Add Team Member" to get started.
                </td>
              </tr>
            ) : (
              teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.member_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.member_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.role || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.allocation_percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.end_date ? new Date(member.end_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Remove team member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Add Team Member</h3>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Team Member <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {searchQuery && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {filteredUsers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No users found</div>
                      ) : (
                        filteredUsers.map((user, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setSearchQuery('');
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {selectedUser && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{selectedUser.name}</div>
                          <div className="text-sm text-gray-600">{selectedUser.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedUser(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    placeholder="e.g., Developer, Designer, Manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allocation Percentage <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={memberForm.allocation_percentage}
                    onChange={(e) => setMemberForm({ ...memberForm, allocation_percentage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={memberForm.start_date}
                      onChange={(e) => setMemberForm({ ...memberForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={memberForm.end_date}
                      onChange={(e) => setMemberForm({ ...memberForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedUser}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Member'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMember(false);
                      setSelectedUser(null);
                      setSearchQuery('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
