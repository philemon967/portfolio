#!/bin/bash
set -e

# Dossier racine contenant p01, p02, ...
BASE_DIR="images/photos"

echo "=== Conversion des images dans $BASE_DIR ==="

#######################################
# 1) Convertir tous les fichiers NON .jpg/.jpeg en JPEG
#    puis supprimer l'original.
#######################################
find "$BASE_DIR" -type f \
  ! -iname "*.jpg" \
  ! -iname "*.jpeg" \
  ! -iname ".DS_Store" | while IFS= read -r img; do

  new="${img%.*}.jpeg"
  echo "-> $img  ==>  $new"

  # Conversion en JPEG, taille réelle (pas de redimensionnement)
  sips -s format jpeg "$img" --out "$new" >/dev/null

  # Suppression de l'ancien fichier
  rm "$img"
done

#######################################
# 2) Renommer tous les .jpeg en .jpg
#######################################
echo "=== Renommage .jpeg -> .jpg ==="

find "$BASE_DIR" -type f -iname "*.jpeg" | while IFS= read -r img; do
  new="${img%.*}.jpg"
  echo "-> $img  ==>  $new"
  mv "$img" "$new"
done

echo "=== Terminé ==="

