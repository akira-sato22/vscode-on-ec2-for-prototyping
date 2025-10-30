import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VSCodeInstance } from "./constructs/vscode-instance";

export interface VscodeOnEc2ForPrototypingStackProps extends cdk.StackProps {
  instanceCount: number;
}

export class VscodeOnEc2ForPrototypingStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: VscodeOnEc2ForPrototypingStackProps
  ) {
    super(scope, id, props);

    const paramVolume: number = this.node.tryGetContext("volume")!;
    const paramNvm: string = this.node.tryGetContext("nvm")!;
    const paramNode: string = this.node.tryGetContext("node")!;

    const vpc = new ec2.Vpc(this, "VSCodeVPC", {});

    // Create multiple VSCode instances
    for (let i = 1; i <= props.instanceCount; i++) {
      const instance = new VSCodeInstance(this, `VSCodeInstance${i}`, {
        vpc,
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.MEDIUM
        ),
        instanceNumber: i,
        volume: paramVolume,
        nvm: paramNvm,
        node: paramNode,
      });

      new cdk.CfnOutput(this, `InstanceID${i}`, {
        value: instance.instanceId,
        exportName: `VscodeOnEc2-InstanceID-${i}`,
      });

      new cdk.CfnOutput(this, `PrivateIP${i}`, {
        value: instance.instancePrivateIp,
        exportName: `VscodeOnEc2-PrivateIP-${i}`,
      });
    }
  }
}
