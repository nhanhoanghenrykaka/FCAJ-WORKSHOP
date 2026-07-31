import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  getProfile,
  getWishlist,
  removeWishlist,
  updateAddress,
  updateProfile,
  uploadProfileImage,
} from "../../api/storeApi";
import { getApiErrorMessage } from "../../api/client";
import { Loading } from "../../components/common/Loading";
import { Pagination } from "../../components/common/Pagination";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { ProductVisual } from "../../components/common/ProductVisual";
import type { Address, Product, User } from "../../types";
import { formatCurrency } from "../../utils/format";
import { useAuth } from "../../hooks/useAuth";
import { usePagination } from "../../hooks/usePagination";

type AddressForm = Omit<Address, "id" | "createdAt">;
const blankAddress: AddressForm = {
  receiverName: "",
  phone: "",
  line1: "",
  ward: "",
  district: "",
  province: "",
  defaultAddress: false,
};

export default function Account() {
  const { token, loginUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(blankAddress);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [deleteAddressId, setDeleteAddressId] = useState<number | null>(null);
  const addressPager = usePagination(addresses, 6);
  const wishlistPager = usePagination(wishlist, 8);

  useEffect(() => {
    Promise.all([getProfile(), getAddresses(), getWishlist()])
      .then(([user, addressData, wishlistData]) => {
        setProfile(user);
        setAddresses(addressData);
        setWishlist(wishlistData);
      })
      .catch((error) => toast.error(getApiErrorMessage(error, "Could not load your account.")))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ name: profile.name, email: profile.email, phone: profile.phone ?? "", profileImageUrl: profile.profileImageUrl ?? null });
      setProfile(updated);
      if (token) loginUser(token, updated);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update profile."));
    } finally {
      setSavingProfile(false);
    }
  }


  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;
    setUploadingAvatar(true);
    try {
      const updated = await uploadProfileImage(file);
      setProfile(updated);
      if (token) loginUser(token, updated);
      toast.success("Profile image saved.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save profile image."));
    } finally { setUploadingAvatar(false); }
  }

  async function saveAddress(event: React.FormEvent) {
    event.preventDefault();
    try {
      const saved = editingAddressId
        ? await updateAddress(editingAddressId, addressForm)
        : await createAddress(addressForm);
      setAddresses((current) => {
        const next = editingAddressId
          ? current.map((item) => item.id === saved.id ? saved : item)
          : [saved, ...current];
        return saved.defaultAddress
          ? next.map((item) => ({ ...item, defaultAddress: item.id === saved.id }))
          : next;
      });
      setAddressForm(blankAddress);
      setEditingAddressId(null);
      toast.success(editingAddressId ? "Address updated." : "Address added.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save address."));
    }
  }

  function editAddress(address: Address) {
    setEditingAddressId(address.id);
    setAddressForm({
      receiverName: address.receiverName,
      phone: address.phone,
      line1: address.line1,
      ward: address.ward ?? "",
      district: address.district ?? "",
      province: address.province,
      defaultAddress: address.defaultAddress,
    });
  }

  async function removeAddress(id: number) {
    try {
      await deleteAddress(id);
      setAddresses((current) => current.filter((item) => item.id !== id));
      toast.success("Address deleted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete address."));
    }
  }

  async function removeWish(productId: number) {
    try {
      await removeWishlist(productId);
      setWishlist((current) => current.filter((item) => item.id !== productId));
      toast.success("Removed from wishlist.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update wishlist."));
    }
  }

  if (loading || !profile) return <main className="page-shell"><Loading label="Loading account" /></main>;

  return (
    <main className="page-shell account-page">
      <header className="page-heading compact-heading">
        <div><p className="section-kicker">My account</p><h1>Your Shopsflow profile.</h1></div>
        <p>Manage your profile, delivery addresses and saved products.</p>
      </header>

      <section className="account-grid">
        <form className="admin-table-card account-card" onSubmit={saveProfile}>
          <div className="admin-card-head"><h2>Profile</h2><span>Customer details</span></div>
          <div className="account-card-body">
            <div className="profile-avatar-editor">{profile.profileImageUrl ? <img src={profile.profileImageUrl} alt={`${profile.name} profile`} /> : <div className="profile-avatar-placeholder">{profile.name.slice(0, 1).toUpperCase()}</div>}<label className="button button-secondary"><input type="file" accept="image/*" disabled={uploadingAvatar} onChange={(event) => void uploadAvatar(event)} />{uploadingAvatar ? "Uploading…" : "Choose profile image"}</label>{profile.profileImageUrl && <button type="button" className="text-button danger-text" onClick={() => setProfile({ ...profile, profileImageUrl: null })}>Remove image</button>}</div>
            <label className="form-field"><span>Name</span><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></label>
            <label className="form-field"><span>Email</span><input type="email" value={profile.email} readOnly title="Email changes require a new sign-in flow" /></label>
            <label className="form-field"><span>Phone</span><input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
            <button className="button button-primary" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save profile"}</button>
          </div>
        </form>

        <form className="admin-table-card account-card" onSubmit={saveAddress}>
          <div className="admin-card-head"><h2>{editingAddressId ? "Edit address" : "Add address"}</h2><span>Checkout delivery</span></div>
          <div className="account-card-body">
            <div className="form-grid-two">
              <label className="form-field"><span>Receiver</span><input value={addressForm.receiverName} onChange={(e) => setAddressForm({ ...addressForm, receiverName: e.target.value })} required /></label>
              <label className="form-field"><span>Phone</span><input value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} required /></label>
            </div>
            <label className="form-field"><span>Street / line 1</span><input value={addressForm.line1} onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })} required /></label>
            <div className="form-grid-two">
              <label className="form-field"><span>Ward</span><input value={addressForm.ward ?? ""} onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })} /></label>
              <label className="form-field"><span>District</span><input value={addressForm.district ?? ""} onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })} /></label>
            </div>
            <label className="form-field"><span>Province / City</span><input value={addressForm.province} onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })} required /></label>
            <label className="checkbox-line"><input type="checkbox" checked={addressForm.defaultAddress} onChange={(e) => setAddressForm({ ...addressForm, defaultAddress: e.target.checked })} /> Set as default address</label>
            <div className="row-actions">
              <button className="button button-primary">{editingAddressId ? "Update address" : "Add address"}</button>
              {editingAddressId && <button type="button" className="text-button" onClick={() => { setEditingAddressId(null); setAddressForm(blankAddress); }}>Cancel</button>}
            </div>
          </div>
        </form>
      </section>

      <section className="admin-table-card account-section">
        <div className="admin-card-head"><h2>Saved addresses</h2><span>{addresses.length}</span></div>
        <div className="address-list">
          {addresses.length === 0 && <div className="inline-notice">Add an address before checkout.</div>}
          {addressPager.pageItems.map((address) => (
            <article key={address.id} className="address-card">
              <div><strong>{address.receiverName} {address.defaultAddress && <span className="status-pill status-paid">Default</span>}</strong><p>{address.line1}{address.ward ? `, ${address.ward}` : ""}{address.district ? `, ${address.district}` : ""}, {address.province}</p><small>{address.phone}</small></div>
              <div className="row-actions"><button onClick={() => editAddress(address)}>Edit</button><button className="danger-text" onClick={() => setDeleteAddressId(address.id)}>Delete</button></div>
            </article>
          ))}
        </div>
        <Pagination page={addressPager.page} totalPages={addressPager.totalPages} onPageChange={addressPager.setPage} />
      </section>

      <section className="account-section" id="wishlist">
        <div className="section-heading"><div><p className="section-kicker">Saved for later</p><h2>Wishlist ({wishlist.length})</h2></div></div>
        {wishlist.length === 0 ? <div className="inline-notice">No saved products yet.</div> : (
          <div className="product-grid">
            {wishlistPager.pageItems.map((product) => (
              <article className="catalog-card" key={product.id}>
                <Link className="catalog-card-media" to={`/products/${product.id}`}><ProductVisual imageUrl={product.imageUrl} name={product.name} /></Link>
                <div className="catalog-card-copy"><Link to={`/products/${product.id}`}><h3>{product.name}</h3></Link><strong>{formatCurrency(product.price)}</strong><button type="button" className="text-button danger-text" onClick={() => void removeWish(product.id)}>Remove</button></div>
              </article>
            ))}
          </div>
        )}
        <Pagination page={wishlistPager.page} totalPages={wishlistPager.totalPages} onPageChange={wishlistPager.setPage} />
      </section>

      <ConfirmDialog
        open={deleteAddressId !== null}
        title="Delete address?"
        message="This saved delivery address will be removed from your account."
        confirmLabel="Delete address"
        danger
        onCancel={() => setDeleteAddressId(null)}
        onConfirm={() => {
          const id = deleteAddressId;
          setDeleteAddressId(null);
          if (id !== null) void removeAddress(id);
        }}
      />
    </main>
  );
}
