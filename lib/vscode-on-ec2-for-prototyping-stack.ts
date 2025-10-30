import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";

export class VscodeOnEc2ForPrototypingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const paramVolume: number = this.node.tryGetContext("volume")!;
    const paramNvm: string = this.node.tryGetContext("nvm")!;
    const paramNode: string = this.node.tryGetContext("node")!;

    const vpc = new ec2.Vpc(this, "VSCodeVPC", {});
    const host = new ec2.BastionHostLinux(this, "VSCodeBastionHost", {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      //
      // To confirm the device name
      // ```
      // aws ec2 describe-images --region ap-northeast-1 --image-ids ami-0506f0f56e3a057a4
      // ```
      //
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(paramVolume),
        },
      ],
    });

    host.instance.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["*"],
        resources: ["*"],
      })
    );

    host.instance.addUserData(
      `#!/bin/bash
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
sudo sh -c 'echo -e "[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" > /etc/yum.repos.d/vscode.repo'

# https://github.com/amazonlinux/amazon-linux-2023/issues/397
sleep 10

sudo dnf install -y code git
sudo tee /etc/systemd/system/code-server.service <<EOF
[Unit]
Description=Start code server

[Service]
ExecStart=/usr/bin/code serve-web --port 8080 --host 0.0.0.0 --without-connection-token
Restart=always
Type=simple
User=ec2-user

[Install]
WantedBy = multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now code-server

# Install Node.js
sudo -u ec2-user -i <<'NODE_EOF'
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${paramNvm}/install.sh | bash
source .bashrc
nvm install ${paramNode}
nvm use ${paramNode}

# Install AWS CDK globally
npm install -g aws-cdk
NODE_EOF

# Update AWS CLI to latest version
sudo dnf update -y awscli

# Install Docker & Docker Compose
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Install Docker Compose V2
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d '"' -f 4)
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/download/\${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Install pip
sudo dnf install -y python3-pip
sudo python3 -m pip install --upgrade pip

# Setup PATH for all users (system-wide)
sudo tee /etc/profile.d/custom-path.sh > /dev/null <<'PROFILE_EOF'
export PATH=$PATH:/usr/local/bin
PROFILE_EOF
sudo chmod +x /etc/profile.d/custom-path.sh

# Setup PATH for ec2-user's local bin
echo 'export PATH=$PATH:$HOME/.local/bin' >> /home/ec2-user/.bashrc
sudo chown ec2-user:ec2-user /home/ec2-user/.bashrc

# Install AWS SAM CLI as ec2-user
sudo -u ec2-user bash <<'SAM_EOF'
export PATH=$PATH:$HOME/.local/bin
pip3 install --user aws-sam-cli
SAM_EOF

# Install Terraform
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
sudo dnf install -y terraform`
    );

    new cdk.CfnOutput(this, "InstanceID", {
      value: host.instanceId,
    });

    new cdk.CfnOutput(this, "PrivateIP", {
      value: host.instancePrivateIp,
    });
  }
}
