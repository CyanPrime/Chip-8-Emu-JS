// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  // Great success! All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}

var debug = true;
var errorOn0 = false;
var game = new Array();
var error = false;

function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.
	var file = files[0];


	var reader = new FileReader();
	reader.onload = function(e) {
		if(debug) console.log(e.target.result.byteLength);
		game = new Uint8Array(e.target.result);
		
		startEmu();
	};

	reader.onerror = function(e) {
		console.log(e);
	};
	reader.readAsArrayBuffer(file);
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  // Setup the dnd listeners.
  var dropZone = document.getElementById('drop_zone');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileSelect, false);

var chip8 = function(){
	this.reset();
}

chip8.prototype.reset = function(){
	this.opcode = 0; //two bytes long
	
	var memory = new ArrayBuffer(0x1000); 
	this.memory = new Uint8Array(memory);
	
	this.V = new Array(16);
	
	//0x000 to 0xFFF
	this.I = 0; // two bytes long(?)
	this.pc = 0x200; // two bytes long(?)
	if(debug) console.log("pc: " + this.pc);
	//total of 2048 
	this.gfx = new Array(64 * 32);
	
	for(var x = 0; x < 64; x++){
		for(var y = 0; y < 32; y++){
			this.gfx[(y * 64) + x] = 0;
		}
	}
	
	this.delay_timer = 0; // 1 byte long(?)
	this.sound_timer = 0; // 1 byte long(?)
	
	this.stack = new Array(16); // 2 bytes long(?) - ushort
	this.sp = 0; // 2 bytes long(?) - ushort
	
	this.key = new Array(16); // 1 bytes long(?) - uchar
	
	for(var i = 0; i < 16; ++i){
		this.key[i] = 0;
	}
    //0x00E0 – Clears the screen
    //0xDXYN – Draws a sprite on the screen
	this.draw = false;
	
	this.chip8_fontset = 
	[
	  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
	  0x20, 0x60, 0x20, 0x20, 0x70, // 1
	  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
	  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
	  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
	  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
	  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
	  0xF0, 0x10, 0x20, 0x40, 0x40, // 7
	  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
	  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
	  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
	  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
	  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
	  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
	  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
	  0xF0, 0x80, 0xF0, 0x80, 0x80  // F
	];
}

chip8.prototype.loadGame = function(myGame){
	for(var i = 0; i < myGame.byteLength; ++i){
		//0x200 == 512.
		this.memory[i + 0x200] = myGame[i];
	}
}

chip8.prototype.cycle = function(){
	// Fetch Opcode
	this.opcode = this.memory[this.pc] << 8 | this.memory[this.pc + 1];
	
	// Decode Opcode
	switch(this.opcode & 0xF000){
		case 0x0000:
			switch(this.opcode & 0x00FF)
			{ 
				//case 0x0000:
					//this.pc += 2;
				//break;
			
				case 0x00E0: // 0x00E0: Clears the screen 
					console.log("clear the screen");
					for(var x = 0; x < 64; x++){
						for(var y = 0; y < 32; y++){
							this.gfx[(y * 64) + x] = 0;
						}
					}
					this.draw = true;
					
					this.pc += 2;
				break;
			 
				case 0x00EE: // 0x00EE: Returns from subroutine 
					 console.log("Returns from subroutine");			  
					--this.sp
					this.pc = this.stack[this.sp];
					this.pc += 2;
				break;
		 
				default:
					if(errorOn0){
						console.log("Unknown opcode: " + this.opcode.toString(16));
						error = true;
					}
				break;				
			}
		
		 // JP addr
		// 1nnnn
		// Jump to location nnn
		case 0x1000:
			if(debug) console.log("jump to addr: " + (this.opcode & 0x0FFF));	
			this.pc = this.opcode & 0x0FFF;
		break;

		case 0x2000:
			
			console.log("Calls subroutine at: " + (this.opcode & 0x0FFF));	
			this.stack[this.sp] = this.pc;
			this.sp++;
			this.pc = this.opcode & 0x0FFF;
			this.pc += 2;
		break;
		
		case 0x3000: // 0x3XNN: Skips the next instruction if VX equals NN
			if(this.V[(this.opcode & 0x0F00) >> 8] == (this.opcode & 0x00FF))
				this.pc += 4;
			else
				this.pc += 2;
		break;
		
		case 0x4000: // 0x4XNN: Skips the next instruction if VX doesn't equals NN
			if(this.V[(this.opcode & 0x0F00) >> 8] != (this.opcode & 0x00FF))
				this.pc += 4;
			else
				this.pc += 2;
		break;
		
		case 0x5000: // 0x4XNN: Skips the next instruction if VX equals NN
			if(this.V[(this.opcode & 0x0F00) >> 8] == this.V[(this.opcode & 0x00F0) >> 4])
				this.pc += 4;
			else
				this.pc += 2;
		break;
		
		//6XNN
		//V[X] = NN;
		case 0x6000:
			if(debug) console.log("call opcode: 6XNN");
			if(debug) console.log("full opcode: " + this.opcode.toString(16));
			this.V[(this.opcode & 0x0F00) >> 8] = (this.opcode & 0xFF);
			this.pc += 2;
		break;
		
		//7XNN
		//Adds NN to VX.
		case 0x7000:
			var val = (this.opcode & 0xFF) + this.V[(this.opcode & 0x0F00) >> 8];
			
			if (val > 255) {
				val -= 256;
			}
			
			this.V[(this.opcode & 0x0F00) >> 8] = val;
			this.pc += 2;
		break;
		
		
		
		case 0x8000:
			switch((this.opcode & 0x000f)){
				//8XY0
				//Sets VX to the value of VY.
				case 0x0000:
					this.V[(this.opcode & 0x0F00) >> 8] = this.V[(this.opcode & 0x00F0) >> 4];
					this.pc += 2;
				break;
				
				//8XY1
				//Sets VX to VX OR VY.
				case 0x0001:
					this.V[(this.opcode & 0x0F00) >> 8] |= this.V[(this.opcode & 0x00F0) >> 4];
					this.pc += 2;
				break;
				
				//8XY2
				//Sets VX to VX AND VY.
				case 0x0002:
					this.V[(this.opcode & 0x0F00) >> 8] &= this.V[(this.opcode & 0x00F0) >> 4];
					this.pc += 2;
				break;
				
				//8XY3
				//Sets VX to VX XOR VY.
				case 0x0003:
					this.V[(this.opcode & 0x0F00) >> 8] ^= this.V[(this.opcode & 0x00F0) >> 4];
					this.pc += 2;
				break;
				
				//8XY4
				//Adds VY to VX. VF is set to 1 when there's a carry, and to 0 when there isn't.
				case 0x0004:
					if(this.V[(this.opcode & 0x0F00) >> 8] > (0xFF - this.V[(this.opcode & 0x00F0) >> 4]))
						this.V[0xF] = 1;
					else
						this.V[0xF] = 0;
					
					this.V[(this.opcode & 0x0F00) >> 8] += this.V[(this.opcode & 0x00F0) >> 4];
					this.pc += 2;
				break;
				
				//8XY5
				//VY is subtracted from VX. VF is set to 0 when there's a borrow, and 1 when there isn't.
				case 0x0005:
					if(this.V[(this.opcode & 0x00F0) >> 4] > this.V[(this.opcode & 0x0F00) >> 8])
						this.V[0xF] = 0; // there's a borrow.
					else
						this.V[0xF] = 1;
					
					this.V[(this.opcode & 0x0F00) >> 8] -= this.V[(this.opcode & 0x00F0) >> 4];
					this.pc += 2;
				break;
				
				//8XY6
				//Shifts VX right by one. VF is set to the value of the least significant bit of VX before the shift.
				case 0x0006:
					this.V[0xF] = this.V[(this.opcode & 0x0F00) >> 8] & 0x1;
					this.V[(this.opcode & 0x0F00) >> 8] >>= 1;
					this.pc += 2;
				break;
				
				//8XY7
				// 	Sets VX to VY minus VX. VF is set to 0 when there's a borrow, and 1 when there isn't.
				case 0x0007:
					if(this.V[(this.opcode & 0x00F0) >> 4] > this.V[(this.opcode & 0x0F00) >> 8])
						this.V[0xF] = 0; // there's a borrow.
					else
						this.V[0xF] = 1;
					
					this.V[(this.opcode & 0x0F00) >> 8] = this.V[(this.opcode & 0x00F0) >> 4] - this.V[(this.opcode & 0x0F00) >> 8];
					this.pc += 2;
				break;
				
				//8XYE
				//Shifts VX left by one. VF is set to the value of the most significant bit of VX before the shift.
				case 0x000E:
					this.V[0xF] = this.V[(this.opcode & 0x0F00) >> 8] & 0x7;
					this.V[(this.opcode & 0x0F00) >> 8] >>= 1;
					this.pc += 2;
				break;
				
				default:
					console.log("Unknown opcode: " + this.opcode.toString(16));
				break;
			}
		break;
		
		case 0x9000: // 9XY0:  Skips the next instruction if VX doesn't equal VY.
			if(this.V[(this.opcode & 0x0F00) >> 8] != this.V[(this.opcode & 0x00F0) >> 4])
				this.pc += 4;
			else
				this.pc += 2;
		break;
		
		/*case 0x4000:
			if(debug) console.log("call opcode 0x0004");	
			if(this.V[(this.opcode & 0x00F0) >> 4] > (0xFF - this.V[(this.opcode & 0x0F00) >> 8])){
				this.V[0xF] = 1; //carry
			}
			
			else{
				this.V[0xF] = 0; // no carry
			}
			
			this.V[(this.opcode & 0x0F00) >> 8] += this.V[(this.opcode & 0x00F0) >> 4];
			this.pc += 2;
		break;
		
		case 0x0033:
			if(debug) console.log("call opcode 0x0033");	
			this.memory[this.I]		= this.V[(this.opcode & 0x0F00) >> 8] / 100;
			this.memory[this.I + 1]	= (this.V[(this.opcode & 0x0F00) >> 8] / 10) % 10;
			this.memory[this.I + 2]	= (this.V[(this.opcode & 0x0F00) >> 8] / 100) % 10;
			++this.pc;
		break;
		*/
				
		//ANNN
		//I = NNN;
		case 0xA000:// Execute Opcode
			if(debug) console.log("set I to: " + (this.opcode & 0xFFF));	
			this.I = (this.opcode & 0xFFF);
			this.pc += 2;
		break;
		
		case 0xB000: // BNNN: Jumps to the address NNN plus V0
			this.pc = (this.opcode & 0x0FFF) + this.V[0];
		break;
		
		case 0xC000: // CXNN: Sets VX to a random number and NN
			this.V[(this.opcode & 0x0F00) >> 8] = (Math.random() % 0xFF) & (this.opcode & 0x00FF);
			this.pc += 2;
		break;
		
		case 0xD000:
			if(debug) console.log("call opcode 0xDXYN")
			if(debug) console.log("full opcode: " + this.opcode.toString(16));	
			var x = this.V[(this.opcode & 0x0F00) >> 8];
			var y = this.V[(this.opcode & 0x00F0) >> 4];
			var height = (this.opcode & 0x000F);
			var pixel;
			
			this.V[0xF] = 0;
			for(var yLine = 0; yLine < height; yLine++){
				pixel = this.memory[this.I + yLine];
				for(var xLine = 0; xLine < 8; xLine++){
					if((pixel & (0x80 >> xLine)) > 0){
						if(this.gfx[(x + xLine + ((y +yLine) *64))] == 1){
							this.V[0xF] = 1;
						}
						
						this.gfx[x + xLine + ((y + yLine) * 64)] ^= 1;
					}
				}
			}
			
			this.draw = true;
			if(debug) console.log("this.pc: " + this.pc);
			this.pc += 2;
			if(debug) console.log("this.pc2: " + this.pc);
		break;
		
		case 0xE000:
			switch((this.opcode & 0x00FF)){
				//EX9E
				//Skips the next instruction if the key stored in VX is pressed.
				case 0x009E:
					if(this.key[this.V[(this.opcode & 0x0F00) >> 8]] != 0)
						this.pc += 4;
					else
						this.pc += 2;
				break;
				
				//EXA1
				//Skips the next instruction if the key stored in VX isn't pressed.
				case 0x00A1:
					console.log("key = " + this.key[this.V[(this.opcode & 0x0F00) >> 8]]);
					if(this.key[this.V[(this.opcode & 0x0F00) >> 8]] == 0){
						console.log("key in VX not pressed. Skip");
						this.pc += 4;
					}
					else{
						console.log("key in VX pressed. No Skip");
						this.pc += 2;
					}
				break;
				
				default:
					console.log("Unknown opcode: " + this.opcode.toString(16));
				break;
			}
		break;
		
		case 0xF000:
			switch(this.opcode & 0x00FF){
				
				//FX07
				//Sets VX to the value of the delay timer.
				case 0x0007:
					this.V[(this.opcode & 0x0F00) >> 8] = this.delay_timer;
					this.pc += 2;
				break;
				
				case 0x000A: // FX0A: A key press is awaited, and then stored in VX		
				{
					var keyPress = false;

					for(var i = 0; i < 16; ++i)
					{
						if(this.key[i] != 0)
						{
							this.V[(this.opcode & 0x0F00) >> 8] = i;
							keyPress = true;
						}
					}

					// If we didn't received a keypress, skip this cycle and try again.
					if(!keyPress)						
						return;

					this.pc += 2;					
				}
				break;
				
				case 0x0015:
					this.delay_timer = this.V[(this.opcode & 0x0F00) >> 8];
					this.pc += 2;		
				break;
				
				case 0x0018:
					this.sound_timer = this.V[(this.opcode & 0x0F00) >> 8];
					this.pc += 2;		
				break;
				
				case 0x001E: // FX1E: Adds VX to I
					if(this.I + this.V[(this.opcode & 0x0F00) >> 8] > 0xFFF)	// VF is set to 1 when range overflow (I+VX>0xFFF), and 0 when there isn't.
						this.V[0xF] = 1;
					else
						this.V[0xF] = 0;
					this.I += this.V[(this.opcode & 0x0F00) >> 8];
					this.pc += 2;
				break;

				case 0x0029: // FX29: Sets I to the location of the sprite for the character in VX. Characters 0-F (in hexadecimal) are represented by a 4x5 font
					this.I = this.V[(this.opcode & 0x0F00) >> 8] * 0x5;
					this.pc += 2;
				break;

				case 0x0033: // FX33: Stores the Binary-coded decimal representation of VX at the addresses I, I plus 1, and I plus 2
					this.memory[this.I]     = this.V[(this.opcode & 0x0F00) >> 8] / 100;
					this.memory[this.I + 1] = (this.V[(this.opcode & 0x0F00) >> 8] / 10) % 10;
					this.memory[this.I + 2] = (this.V[(this.opcode & 0x0F00) >> 8] % 100) % 10;					
					this.pc += 2;
				break;

				case 0x0055: // FX55: Stores V0 to VX in memory starting at address I					
					for (var i = 0; i <= ((this.opcode & 0x0F00) >> 8); ++i)
						this.memory[this.I + i] = this.V[i];	

					// On the original interpreter, when the operation is done, I = I + X + 1.
					I += ((this.opcode & 0x0F00) >> 8) + 1;
					pc += 2;
				break;
				
				case 0x0065: // FX65: Fills V0 to VX with values from memory starting at address I					
					for (var i = 0; i <= ((this.opcode & 0x0F00) >> 8); ++i)
						this.V[i] = this.memory[this.I + i];			

					// On the original interpreter, when the operation is done, I = I + X + 1.
					this.I += ((this.opcode & 0x0F00) >> 8) + 1;
					this.pc += 2;
				break;
				
				default:
					console.log("Unknown opcode: " + this.opcode.toString(16));
				break;
			}
		break;
		
		default:
			console.log("Unknown opcode: " + this.opcode.toString(16));
		break;
	}
	
	
 
	// Update timers
	if(this.delay_time > 0) this.delay_time--;
	if(this.sound_timer > 0) this.sound_timer--;
}

chip8.prototype.setKeys = function(){

}



 document.onkeydown = function(e){
	var key = e.keyCode;
	
	//if(key == 27)    // esc
	//	exit(0);

	if(debug) console.log("key: " + key);
	
	if(key == 49)		myChip8.key[0x1] = 1;
	else if(key == 50)	myChip8.key[0x2] = 1;
	else if(key == 51)	myChip8.key[0x3] = 1;
	else if(key == 52)	myChip8.key[0xC] = 1;

	else if(key == 81)	myChip8.key[0x4] = 1;
	else if(key == 87)	myChip8.key[0x5] = 1;
	else if(key == 69)	myChip8.key[0x6] = 1;
	else if(key == 82)	myChip8.key[0xD] = 1;

	else if(key == 65)	myChip8.key[0x7] = 1;
	else if(key == 83)	myChip8.key[0x8] = 1;
	else if(key == 68)	myChip8.key[0x9] = 1;
	else if(key == 70)	myChip8.key[0xE] = 1;

	else if(key == 90)	myChip8.key[0xA] = 1;
	else if(key == 88)	myChip8.key[0x0] = 1;
	else if(key == 67)	myChip8.key[0xB] = 1;
	else if(key == 86)	myChip8.key[0xF] = 1;
	
}

 document.onkeyup = function(e){
	var key = e.keyCode;
	
	//if(key == 27)    // esc
	//	exit(0);

	if(debug) console.log("keyup: " + key);
	
	if(key == 49)		myChip8.key[0x1] = 0;
	else if(key == 50)	myChip8.key[0x2] = 0;
	else if(key == 51)	myChip8.key[0x3] = 0;
	else if(key == 52)	myChip8.key[0xC] = 0;

	else if(key == 81)	myChip8.key[0x4] = 0;
	else if(key == 87)	myChip8.key[0x5] = 0;
	else if(key == 69)	myChip8.key[0x6] = 0;
	else if(key == 82)	myChip8.key[0xD] = 0;

	else if(key == 65)	myChip8.key[0x7] = 0;
	else if(key == 83)	myChip8.key[0x8] = 0;
	else if(key == 68)	myChip8.key[0x9] = 0;
	else if(key == 70)	myChip8.key[0xE] = 0;

	else if(key == 90)	myChip8.key[0xA] = 0;
	else if(key == 88)	myChip8.key[0x0] = 0;
	else if(key == 67)	myChip8.key[0xB] = 0;
	else if(key == 86)	myChip8.key[0xF] = 0;
	
}

//main
var myChip8 = new chip8();
	
	
var startEmu = function(){
	//setup graphics
	//setup input

	myChip8.reset(); //(?)
	myChip8.loadGame(game);
	
	setInterval(function(){ mainLoop() }, (1000/60)/60);
	
	//make not inf
	

	//---------------------------------
	//testing
	//---------------------------------

	//myChip8.cycle();
}

var mainLoop = function(){
	//for(var i = 0; i <= 60; i++){
		if(!error){
			myChip8.cycle();
			
			if(myChip8.draw)
				drawGraphics();
			
			myChip8.setKeys();
		}
	//}
}

var c = document.getElementById("screen");
var ctx = c.getContext("2d");

var drawGraphics = function(){
	ctx.fillStyle = "#000000";
	ctx.fillRect(0,0,640,480);
	
	ctx.fillStyle = "#FFFFFF";
	for(var x = 0; x < 64; x++){
		for(var y = 0; y < 32; y++){
			if(myChip8.gfx[(y * 64) + x] == 1){
				//console.log("gfx: " + myChip8.gfx[(y * 64) + x]);
				ctx.fillRect(x * 10,y * 10,10,10);
			}
			//console.log("gfx: " + myChip8.gfx[(y * 64) + x]);
		}
	}
	
}