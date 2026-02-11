"use client";

import { useState } from "react";
import { ImageUpload } from "./ImageUpload";

interface ListingFormProps {
  categories: readonly string[];
  brands: readonly string[];
  conditions: readonly string[];
  onSubmit: (payload: {
    category: string;
    brand: string;
    model: string;
    condition: string;
    description: string;
    price: string;
    images: File[];
  }) => void;
  submitting: boolean;
}

export function ListingForm({
  categories,
  brands,
  conditions,
  onSubmit,
  submitting,
}: ListingFormProps) {
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length < 3 || images.length > 6) {
      alert("Please upload between 3 and 6 images.");
      return;
    }
    onSubmit({
      category,
      brand,
      model,
      condition,
      description,
      price,
      images,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label className="block text-sm font-medium text-mowing-green mb-1">
          Category *
        </label>
        <select
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
        >
          <option value="">Select</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-mowing-green mb-1">
          Brand *
        </label>
        <select
          required
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
        >
          <option value="">Select</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-mowing-green mb-1">
          Model *
        </label>
        <input
          type="text"
          required
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. Stealth 2 Plus"
          className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-mowing-green mb-1">
          Condition *
        </label>
        <select
          required
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green"
        >
          <option value="">Select</option>
          {conditions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-mowing-green mb-1">
          Price (£) *
        </label>
        <input
          type="number"
          required
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-mowing-green mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Any details that help buyers..."
          className="w-full rounded-lg border border-mowing-green/30 bg-white px-4 py-2 text-mowing-green placeholder:text-mowing-green/50 resize-y"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-mowing-green mb-1">
          Images (3–6) *
        </label>
        <ImageUpload
          min={3}
          max={6}
          value={images}
          onChange={setImages}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-mowing-green text-off-white-pique py-3 font-semibold hover:opacity-90 disabled:opacity-70"
      >
        {submitting ? "Submitting…" : "Submit for verification"}
      </button>
    </form>
  );
}
