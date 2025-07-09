import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, User, Upload, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { FamilyMember } from '../../types';

interface MemberForm {
  firstName: string;
  lastName: string;
  nip: string;
  relationship: string;
  birthDate: string;
}

export default function FamilyManagement() {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MemberForm>();

  const relationshipOptions = [
    'Époux/Épouse',
    'Fils',
    'Fille',
    'Père',
    'Mère',
    'Frère',
    'Sœur',
    'Autre'
  ];

  // Charger les membres de famille depuis Firebase
  useEffect(() => {
    if (!user) return;

    const loadFamilyMembers = async () => {
      try {
        setLoading(true);
        const familyMembers = await userService.getFamilyMembers(user.id);
        setMembers(familyMembers);
      } catch (error) {
        console.error('Erreur lors du chargement des membres de famille:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFamilyMembers();
  }, [user]);

  const onSubmit = async (data: MemberForm) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      if (editingMember) {
        // Mettre à jour un membre existant
        await userService.updateFamilyMember(editingMember.id, {
          ...data,
          updatedAt: new Date()
        });
        
        // Mettre à jour l'état local
        setMembers(members.map(member => 
          member.id === editingMember.id 
            ? { ...member, ...data, updatedAt: new Date() }
            : member
        ));
      } else {
        // Créer un nouveau membre
        const newMemberData = {
          userId: user.id,
          ...data,
          documents: selectedFiles.map(file => file.name),
          updatedAt: new Date()
        };
        
        const memberId = await userService.addFamilyMember(newMemberData);
        
        // Ajouter à l'état local
        const newMember: FamilyMember = {
          id: memberId,
          ...newMemberData,
          createdAt: new Date()
        };
        
        setMembers([...members, newMember]);
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du membre:', error);
      alert('Erreur lors de la sauvegarde du membre de famille');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    reset({
      firstName: member.firstName,
      lastName: member.lastName,
      nip: member.nip,
      relationship: member.relationship,
      birthDate: member.birthDate
    });
    setShowModal(true);
  };

  const handleDelete = async (memberId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      try {
        await userService.deleteFamilyMember(memberId);
        setMembers(members.filter(member => member.id !== memberId));
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du membre');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setSelectedFiles([]);
    reset();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Informations familiales</h1>
          <p className="text-gray-600 mt-2">Gérez les membres de votre famille et leurs documents</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-5 w-5 mr-2" />
          Ajouter un membre
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Membres famille</p>
              <p className="text-2xl font-bold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Documents</p>
              <p className="text-2xl font-bold text-gray-900">{members.reduce((total, member) => total + member.documents.length, 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Enfants</p>
              <p className="text-2xl font-bold text-gray-900">{members.filter(m => calculateAge(m.birthDate) < 18).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      {members.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Aucun membre de famille ajouté</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Ajouter le premier membre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div key={member.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{member.firstName} {member.lastName}</h3>
                    <p className="text-sm text-gray-600">{member.relationship}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(member)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">NIP</span>
                  <span className="text-sm font-medium text-gray-900">{member.nip}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Âge</span>
                  <span className="text-sm font-medium text-gray-900">{calculateAge(member.birthDate)} ans</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Date de naissance</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(member.birthDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Documents</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {member.documents.length}
                    </span>
                  </div>
                  {member.documents.length > 0 && (
                    <div className="space-y-1">
                      {member.documents.slice(0, 2).map((doc, index) => (
                        <div key={index} className="text-xs text-gray-500 truncate">
                          • {doc}
                        </div>
                      ))}
                      {member.documents.length > 2 && (
                        <div className="text-xs text-blue-600">
                          +{member.documents.length - 2} autres documents
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMember ? 'Modifier le membre' : 'Ajouter un membre'}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom
                  </label>
                  <input
                    {...register('firstName', { required: 'Le prénom est requis' })}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Prénom"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom
                  </label>
                  <input
                    {...register('lastName', { required: 'Le nom est requis' })}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NIP (Numéro d'Identification Personnel)
                </label>
                <input
                  {...register('nip', { 
                    required: 'Le NIP est requis',
                    pattern: {
                      value: /^\d{13}$/,
                      message: 'Le NIP doit contenir exactement 13 chiffres'
                    }
                  })}
                  type="text"
                  maxLength={13}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234567890123"
                />
                {errors.nip && (
                  <p className="mt-1 text-sm text-red-600">{errors.nip.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lien de parenté
                </label>
                <select
                  {...register('relationship', { required: 'Le lien de parenté est requis' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionnez...</option>
                  {relationshipOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.relationship && (
                  <p className="mt-1 text-sm text-red-600">{errors.relationship.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de naissance
                </label>
                <input
                  {...register('birthDate', { required: 'La date de naissance est requise' })}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.birthDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.birthDate.message}</p>
                )}
              </div>

              {!editingMember && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documents justificatifs
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Cliquez pour uploader</span>
                        </p>
                        <p className="text-xs text-gray-500">PDF, PNG, JPG (MAX. 10MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">Fichiers sélectionnés :</p>
                      {selectedFiles.map((file, index) => (
                        <p key={index} className="text-xs text-gray-500">• {file.name}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingMember ? 'Modification...' : 'Ajout...'}
                  </div>
                ) : (
                  editingMember ? 'Modifier' : 'Ajouter'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}