import { NodeSSH, SSHExecCommandOptions } from 'node-ssh';
import { generate } from 'random-words';
import DatabaseService from '../db/index.ts';

export class GymVPSService {
  private ip: string;
  private login: {
    privateKey: string;
    username: string;
  };
  constructor(options: { ip: string; username?: string; privateKey: string }) {
    this.ip = options.ip;
    this.login = {
      privateKey: options.privateKey,
      username: options.username || 'ubuntu' // default sudo user
    };
  }

  public async initNewTrainer(
    address: string,
    streamId: string
  ): Promise<{ username: string; password: string; ip: string }> {
    // ssh in and add the new user
    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        host: this.ip,
        username: this.login.username,
        privateKey: this.login.privateKey
      });
    } catch (e) {
      console.log('SSH error:', e);
    }

    const sshCommand = async (givenCommand: string, options?: SSHExecCommandOptions) => {
      const res = await ssh.execCommand(givenCommand, options);
      // console.log(givenCommand.slice(0, 5), res);
      return res;
    };

    console.log('Adding new user to VPS for RDP access.');

    // generate user information from the user's address
    const username = (generate({ exactly: 2, seed: address }) as string[]).join('-');
    const password = (
      generate({
        exactly: 2,
        seed: address + 'password-seed'
      }) as string[]
    ).join('-');

    // Create user
    await sshCommand(`sudo su root -c "useradd -m -s /bin/bash '${username}'"`);
    await sshCommand(`sudo su root -c "echo '${username}:${password}' | chpasswd"`);
    // send the uploader script
    await sshCommand(`sudo -u ${username} mkdir -p /home/${username}/.scripts/`);

    const endpoint = `https://viralmind.ai/api/streams/races/${streamId}/data?secret=${process.env.AX_PARSER_SECRET}`;
    const scriptContent = `#!/bin/bash
ENDPOINT="${endpoint}"
TEMP_FILE=$(mktemp)
echo "Started sending data to \$ENDPOINT"
while true; do
    echo "Generating new data..."
    JSON_DATA=$(gjs -m /usr/local/bin/dump-tree.js)

    # Skip if no JSON_DATA
    if [ -z "\$JSON_DATA" ]; then
        echo "No data received, skipping..."
        sleep 1
        continue
    fi
    
    echo "{\\"data\\": \$JSON_DATA, \\"type\\": \\"ax-tree\\", \\"platform\\": \\"linux\\"}" > "\$TEMP_FILE"
    echo "Sending data..."
    curl -X POST \\
        -H "Content-Type: application/json" \\
        --data-binary @"\$TEMP_FILE" \\
        "\$ENDPOINT"
    echo "Data sent, waiting 1 second..."
    sleep 1
done
rm "\$TEMP_FILE"`;

    // Create script in multiple steps
    await sshCommand(`sudo -u ${username} touch /home/${username}/.scripts/ax-uploader.sh`);
    await sshCommand(`sudo -u ${username} tee /home/${username}/.scripts/ax-uploader.sh > /dev/null << 'EOSCRIPT'
${scriptContent}
EOSCRIPT`);
    await sshCommand(`sudo chmod +x /home/${username}/.scripts/ax-uploader.sh`);
    await sshCommand(`sudo -u ${username} mkdir -p /home/${username}/.config/systemd/user`);

    const serviceContent = `[Unit]
Description=AX Uploader Service
After=default.target
[Service]
Type=simple
ExecStart=/home/${username}/.scripts/ax-uploader.sh
RemainAfterExit=no
[Install]
WantedBy=default.target`;

    // Create the service file without heredoc
    await sshCommand(
      `sudo -u ${username} bash -c "echo '${serviceContent.replace(
        /'/g,
        "'\\''"
      )}' > /home/${username}/.config/systemd/user/ax-uploader.service"`
    );

    const heredocScript = `cat << 'EOPROFILE' > /home/${username}/.xsessionrc
# If this is the first login
if [ ! -f ~/.service-enabled ]; then
    systemctl --user daemon-reload
    systemctl --user enable ax-uploader.service
    systemctl --user start ax-uploader.service
    touch ~/.service-enabled
fi
sleep 5
wget -q https://cdn.viralmind.ai/banner.png -O /home/${username}/.wallpaper.png
gsettings set org.gnome.desktop.background picture-uri file:///home/${username}/.wallpaper.png
sudo gsettings set org.gnome.desktop.background primary-color "#393939"
sudo gsettings set org.gnome.desktop.background picture-options centered

EOPROFILE`;

    await sshCommand(`sudo bash -c '${heredocScript}'`);

    await sshCommand(`sudo chown "${username}:${username}" "/home/${username}/.xsessionrc"`);

    // close the connection
    ssh.dispose();

    await DatabaseService.addGymVPSUser(this.ip, username, password);
    console.log(`Added user ${username} with password ${password} to the server.`);
    return { ip: this.ip, username, password };
  }

  public async removeTrainer(username: string) {
    // ssh in and remove the user
    const ssh = new NodeSSH();
    try {
      await ssh.connect({
        host: this.ip,
        username: this.login.username,
        privateKey: this.login.privateKey
      });
    } catch (e) {
      console.log('SSH error:', e);
    }

    console.log('Removing user from server.');
    while (true) {
      const res = await ssh.execCommand(`sudo su root -c "userdel -r '${username}'"`);
      if (res.stderr.includes('is currently used by process')) {
        const sp = res.stderr.split(' ');
        const pid = sp[sp.length - 1];
        console.log(`User in use by process... Attempting to kill ${pid}.`);
        await ssh.execCommand(`sudo su root -c "kill -9 ${pid}"`);
      } else {
        break;
      }
    }
    await ssh.execCommand(`sudo rm -rf -r '/home/${username}'`);
    // close the connection
    ssh.dispose();
    // todo: create a usergroup that prevents breaking the system but allows installing packages
    // remove from usergroup
    //await ssh.execCommand(`gpasswd --delete "${username} group`)
    await DatabaseService.removeGymVPSUser(this.ip, username);
  }
}
