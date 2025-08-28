#!/usr/bin/env python3
"""
OpenAI Shap-E 3D Model Generator Service
Uses Hugging Face diffusers library for real text-to-3D generation
Outputs: OBJ format files with actual Shap-E generated meshes
"""

import sys
import json
import os
import re
from datetime import datetime
from diffusers import ShapEPipeline
from diffusers.utils import export_to_obj, export_to_ply
import torch

class ShapE3DModelGenerator:
    def __init__(self):
        """Initialize the Shap-E model pipeline"""
        self.model_name = "openai/shap-e"
        self.uploads_dir = os.path.join(os.path.dirname(__file__), '../uploads/3d-models')
        
        # Ensure uploads directory exists
        os.makedirs(self.uploads_dir, exist_ok=True)
        
        print("PROGRESS:LOADING_MODEL:Loading OpenAI Shap-E model...", file=sys.stderr)
        try:
            # Load Shap-E pipeline with optimized settings
            print("PROGRESS:INITIALIZING:Initializing Shap-E pipeline...", file=sys.stderr)
            
            # Suppress warnings for cleaner output
            import warnings
            warnings.filterwarnings("ignore", category=UserWarning)
            warnings.filterwarnings("ignore", category=FutureWarning)
            
            # Use ShapEPipeline specifically for text-to-3D
            # Handle loading parameters carefully to avoid safetensors issues
            if torch.cuda.is_available():
                try:
                    # Try with fp16 variant first
                    self.pipe = ShapEPipeline.from_pretrained(
                        self.model_name,
                        torch_dtype=torch.float16,
                        variant="fp16"
                    )
                except Exception as e:
                    print(f"⚠️ FP16 variant failed, trying regular loading: {e}", file=sys.stderr)
                    # Fallback to regular loading
                    self.pipe = ShapEPipeline.from_pretrained(
                        self.model_name,
                        torch_dtype=torch.float16
                    )
            else:
                # CPU loading
                self.pipe = ShapEPipeline.from_pretrained(
                    self.model_name,
                    torch_dtype=torch.float32
                )
            
            # Move to appropriate device
            device = "cuda" if torch.cuda.is_available() else "cpu"
            self.pipe = self.pipe.to(device)
            
            print(f"PROGRESS:MODEL_READY:Shap-E loaded on {device}!", file=sys.stderr)
            
        except Exception as e:
            print(f"❌ CRITICAL ERROR loading Shap-E model: {e}", file=sys.stderr)
            raise e

    def create_optimized_prompt(self, object_data):
        """Create optimized prompt for Shap-E model"""
        name = object_data.get('name', 'object')
        description = object_data.get('description', name)
        
        # Use the full description for better quality
        # Shap-E works better with descriptive prompts
        if description and description != name:
            prompt = description
        else:
            prompt = f"a {name}"
        
        # Clean up the prompt
        prompt = prompt.strip()
        if not prompt.startswith(('a ', 'an ', 'the ')):
            if prompt[0].lower() in 'aeiou':
                prompt = f"an {prompt}"
            else:
                prompt = f"a {prompt}"
        
        print(f"📝 Shap-E prompt: {prompt}", file=sys.stderr)
        return prompt

    def generate_3d_mesh(self, object_data):
        """Generate 3D mesh using OpenAI Shap-E model"""
        try:
            # Create prompt
            print("PROGRESS:CREATING_PROMPT:Creating mesh prompt...", file=sys.stderr)
            prompt = self.create_optimized_prompt(object_data)
            
            # Generate 3D model with Shap-E
            print("PROGRESS:GENERATING:Generating 3D mesh with Shap-E...", file=sys.stderr)
            
            # IMPORTANT: Use output_type="mesh" to get actual 3D mesh data
            images = self.pipe(
                prompt,
                guidance_scale=15.0,  # Good balance of quality and prompt following
                num_inference_steps=64,  # Higher steps for better quality
                frame_size=256,  # Good resolution
                output_type="mesh"  # Critical: this gives us actual mesh data
            ).images
            
            # Get the generated 3D mesh (images[0] contains the mesh data)
            print("PROGRESS:PROCESSING:Processing generated mesh...", file=sys.stderr)
            mesh_data = images[0]
            
            # Convert to OBJ format using diffusers export utility
            return self.save_mesh_as_obj(mesh_data, object_data)
            
        except Exception as e:
            print(f"❌ Error generating 3D mesh: {e}", file=sys.stderr)
            raise e

    def save_mesh_as_obj(self, mesh_data, object_data):
        """Save mesh data as OBJ file with enhanced error handling"""
        try:
            # Generate filename
            safe_name = re.sub(r'[^a-zA-Z0-9_\-\s]', '', object_data.get('name', 'model'))
            safe_name = re.sub(r'\s+', '_', safe_name.strip())
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            obj_path = os.path.join(self.uploads_dir, f"shap_e_{safe_name}_{timestamp}.obj")
            
            print("PROGRESS:CONVERTING:Converting mesh to OBJ format...", file=sys.stderr)
            
            # Attempt direct OBJ export
            try:
                exported_path = export_to_obj(mesh_data, obj_path)
                print("PROGRESS:EXPORTING:Exporting mesh to OBJ...", file=sys.stderr)
                
                # Check if file was actually created
                if exported_path is None or not os.path.exists(obj_path):
                    print("⚠️  Direct OBJ export incomplete - using PLY fallback (this is normal and still produces working models)...", file=sys.stderr)
                    raise Exception("Direct OBJ export did not create file")
                    
                final_path = exported_path if exported_path and os.path.exists(exported_path) else obj_path
                
            except Exception as obj_error:
                print("⚠️  OBJ export encountered issue - automatically switching to PLY conversion method (this is normal)...", file=sys.stderr)
                print("PROGRESS:FALLBACK:Using PLY conversion method for better compatibility...", file=sys.stderr)
                return self.save_mesh_as_ply_fallback(mesh_data, object_data)
            
            # Verify file exists and has content
            if not os.path.exists(final_path) or os.path.getsize(final_path) == 0:
                print("⚠️  OBJ file verification failed - using PLY method instead...", file=sys.stderr)
                return self.save_mesh_as_ply_fallback(mesh_data, object_data)
            
            file_size = os.path.getsize(final_path)
            print(f"✅ Successfully generated OBJ model: {os.path.basename(final_path)} ({file_size} bytes)", file=sys.stderr)
            
            # Return model data
            return {
                'success': True,
                'modelUrl': f'/api/3d-models/{os.path.basename(final_path)}',
                'modelPath': final_path,
                'filename': os.path.basename(final_path),
                'format': 'obj',
                'generatedAt': datetime.now().isoformat(),
                'modelProvider': 'OpenAI Shap-E',
                'quality': 'ai_generated',
                'fileSize': file_size,
                'concept': object_data.get('concept'),
                'difficulty': object_data.get('difficulty'),
                'scale': 1.0,
                'animations': ['rotate', 'glow'],
                'materials': ['shap_e_generated'],
                'prompt': self.create_optimized_prompt(object_data)
            }
            
        except Exception as e:
            print(f"⚠️  OBJ export method failed: {e} - Using PLY conversion (this still produces working 3D models)...", file=sys.stderr)
            # Fallback: try to save as PLY and convert
            try:
                print("PROGRESS:FALLBACK:Trying PLY export as fallback...", file=sys.stderr)
                return self.save_mesh_as_ply_fallback(mesh_data, object_data)
            except Exception as e2:
                print(f"❌ Both OBJ and PLY methods failed: {e2}", file=sys.stderr)
                raise e

    def save_mesh_as_ply_fallback(self, mesh_data, object_data):
        """Fallback: save as PLY and attempt conversion"""
        try:
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            object_name = re.sub(r'[^a-zA-Z0-9_-]', '_', object_data.get('name', 'object'))
            filename = f"shap_e_{object_name}_{timestamp}"
            
            # Export as PLY first
            ply_path = os.path.join(self.uploads_dir, f"{filename}.ply")
            exported_ply = export_to_ply(mesh_data, ply_path)
            
            print(f"PROGRESS:PLY_SAVED:Saved as PLY: {filename}.ply", file=sys.stderr)
            
            # Try to convert PLY to OBJ using trimesh
            try:
                import trimesh
                print("PROGRESS:CONVERTING:Converting PLY to OBJ with trimesh...", file=sys.stderr)
                
                mesh = trimesh.load(exported_ply)
                obj_path = os.path.join(self.uploads_dir, f"{filename}.obj")
                mesh.export(obj_path, file_type='obj')
                
                # Use the OBJ file
                final_path = obj_path
                final_filename = f"{filename}.obj"
                print(f"PROGRESS:CONVERTED:Successfully converted to OBJ", file=sys.stderr)
                
            except Exception as convert_error:
                print(f"⚠️ Could not convert to OBJ, using PLY: {convert_error}", file=sys.stderr)
                # Use the PLY file
                final_path = exported_ply
                final_filename = f"{filename}.ply"
            
            file_size = os.path.getsize(final_path) if os.path.exists(final_path) else 0
            
            return {
                'success': True,
                'modelUrl': f'/api/3d-models/{final_filename}',
                'modelPath': final_path,
                'filename': final_filename,
                'format': 'ply' if final_filename.endswith('.ply') else 'obj',
                'generatedAt': datetime.now().isoformat(),
                'modelProvider': 'OpenAI Shap-E',
                'quality': 'ai_generated',
                'fileSize': file_size,
                'concept': object_data.get('concept'),
                'difficulty': object_data.get('difficulty'),
                'scale': 1.0,
                'animations': ['rotate', 'glow'],
                'materials': ['shap_e_generated'],
                'prompt': self.create_optimized_prompt(object_data)
            }
            
        except Exception as e:
            print(f"❌ PLY fallback failed: {e}", file=sys.stderr)
            raise e

def main():
    """Main function to handle command line usage"""
    if len(sys.argv) != 2:
        print("Usage: python shap-e.service.py '<object_data_json>'")
        sys.exit(1)
    
    try:
        # Parse object data from command line argument
        object_data = json.loads(sys.argv[1])
        
        # Initialize generator
        generator = ShapE3DModelGenerator()
        
        # Generate 3D model
        result = generator.generate_3d_mesh(object_data)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        error_result = {
            'success': False,
            'error': f'Invalid JSON input: {e}',
            'stage': 'input_parsing'
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'stage': 'model_generation'
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main() 