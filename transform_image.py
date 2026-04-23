from PIL import Image
import os


def transform_grayscale_to_transparent(input_path, output_path):
    # Open the image and convert to Grayscale ('L' mode)
    img = Image.open(input_path).convert("L")

    # Create a new blank image with the same size, initialized to transparent black
    # 'RGBA' stands for Red, Green, Blue, Alpha
    new_data = []

    # Get the pixel data from the grayscale image
    pixels = img.getdata()

    for pixel_value in pixels:
        # Transformation Logic:
        # The color is always Black (0, 0, 0)
        # The Alpha (transparency) is the original pixel value
        # If original was 255 (White) -> Alpha is 255 (Opaque)
        # If original was 0 (Black) -> Alpha is 0 (Transparent)
        # If original was 128 (Gray) -> Alpha is 128 (Semi-transparent)
        new_data.append((0, 0, 0, pixel_value))

    # Create the new image and save the data
    new_img = Image.new("RGBA", img.size)
    new_img.putdata(new_data)

    # Save as PNG to preserve transparency
    new_img.save(output_path, "PNG")
    print(f"Success! Image saved to: {output_path}")


# --- Configuration ---
input_file = "galaxy.png"  # Replace with your filename
output_file = "transformed_galaxy.png"

if __name__ == "__main__":
    if os.path.exists(input_file):
        transform_grayscale_to_transparent(input_file, output_file)
    else:
        print(f"Error: Could not find {input_file}")
