import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getProfile, updateProfile, uploadProfileImage } from "../../api/storeApi";
import { getApiErrorMessage } from "../../api/client";
import { Loading } from "../../components/common/Loading";
import { useAuth } from "../../hooks/useAuth";
import type { User } from "../../types";

export default function AdminProfile() {
  const { token, loginUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { getProfile().then(setProfile).catch((error) => toast.error(getApiErrorMessage(error, "Could not load admin profile."))); }, []);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !profile) return;
    setUploading(true);
    try {
      const updated = await uploadProfileImage(file);
      setProfile(updated);
      if (token) loginUser(token, updated);
      toast.success("Profile image saved.");
    }
    catch (error) { toast.error(getApiErrorMessage(error, "Could not save profile image.")); }
    finally { setUploading(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!profile) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ name: profile.name, email: profile.email, phone: profile.phone ?? "", profileImageUrl: profile.profileImageUrl ?? null });
      setProfile(updated); if (token) loginUser(token, updated); toast.success("Admin profile updated.");
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not save admin profile.")); }
    finally { setSaving(false); }
  }

  if (!profile) return <main className="page-shell"><Loading label="Loading profile" /></main>;
  return <main className="page-shell account-page"><header className="page-heading compact-heading"><div><p className="section-kicker">Admin profile</p><h1>Your admin account.</h1></div><p>Update the profile image and contact details shown in the admin workspace.</p></header><form className="admin-table-card account-card profile-only-card" onSubmit={save}><div className="admin-card-head"><h2>Profile</h2><span>ADMIN</span></div><div className="account-card-body"><div className="profile-avatar-editor">{profile.profileImageUrl ? <img src={profile.profileImageUrl} alt="Admin profile" /> : <div className="profile-avatar-placeholder">{profile.name.slice(0, 1).toUpperCase()}</div>}<label className="button button-secondary"><input type="file" accept="image/*" disabled={uploading} onChange={(e) => void upload(e)} />{uploading ? "Uploading…" : "Choose profile image"}</label>{profile.profileImageUrl && <button type="button" className="text-button danger-text" onClick={() => setProfile({ ...profile, profileImageUrl: null })}>Remove image</button>}</div><label className="form-field"><span>Name</span><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></label><label className="form-field"><span>Email</span><input value={profile.email} readOnly /></label><label className="form-field"><span>Phone</span><input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label><button className="button button-primary" disabled={saving || uploading}>{saving ? "Saving…" : "Save profile"}</button></div></form></main>;
}
