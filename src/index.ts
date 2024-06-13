import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { v4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
    BUCKET_NAME: string;
    BUCKET_REGION: string;
    ACCESS_KEY: string;
    SECRET_ACCESS_KEY: string;
  };
}>();

app.post("/upload/single", async (c) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: c.env.ACCESS_KEY,
      secretAccessKey: c.env.SECRET_ACCESS_KEY,
    },
    region: c.env.BUCKET_REGION,
  });

  const formData = await c.req.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return c.json({ error: "File is required" }, 400);
  }

  const docId = v4();
  const arrayBuffer = await file.arrayBuffer();
  const fileContent = new Uint8Array(arrayBuffer);

  const params = {
    Body: fileContent,
    Bucket: c.env.BUCKET_NAME,
    Key: `${docId}.${file.name.split(".").pop()}`,
    ContentType: file.type,
  };

  const uploadCommand = new PutObjectCommand(params);
  const response = await s3.send(uploadCommand);
  console.log(params.Key);
  return c.json({ id: docId });
});

app.get("/image", async (c) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: c.env.ACCESS_KEY,
      secretAccessKey: c.env.SECRET_ACCESS_KEY,
    },
    region: c.env.BUCKET_REGION,
  });
  const body = await c.req.json();
  const getObj = {
    Bucket: c.env.BUCKET_NAME,
    Key: body.id,
  };
  const command = new GetObjectCommand(getObj);
  const url = await getSignedUrl(s3, command, { expiresIn: 60 });

  return c.json({ url });
});
app.delete("/delete", async (c) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: c.env.ACCESS_KEY,
      secretAccessKey: c.env.SECRET_ACCESS_KEY,
    },
    region: c.env.BUCKET_REGION,
  });
  const body = await c.req.json();
  console.log(body.id);
  const getObj = {
    Bucket: c.env.BUCKET_NAME,
    Key: body.id,
  };
  const command = new DeleteObjectCommand(getObj);
  try {
    const response = await s3.send(command);
    console.log(response);
  } catch (error) {
    console.log(error);
  }
  return c.text("Deleted");
});

/*    Auth Route     */

//signup route
app.post("/api/v1/signup", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
      },
    });
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({ jwt });
  } catch (e) {
    c.status(403);
    console.log(e);
    return c.json({ error: "Unexpected Error" });
  }
});
//signin route
app.post("/api/v1/signin", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (!user) {
      c.status(403);
      return c.json({ error: "Unexpected Error" });
    }

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({ jwt });
  } catch (error) {
    return c.json({ error });
  }
});
//Home Route
let count = 0;
app.get("/", (c) => {
  count++;
  return c.json({ count });
});

/*    Technology Crud    */
// create tech
app.post("/api/v1/tech", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    try {
      const tech = await prisma.technology.create({
        data: {
          name: body.name,
          type: body.type,
        },
      });
      return c.json({ tech });
    } catch (error) {
      return c.json({ error: "Cannot create this tech , Please check" });
    }
  } catch (error) {
    return c.json({ error: "Problem in Connecting to DB" });
  }
});
// update tech
app.put("/api/v1/tech/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");
    const body = await c.req.json();

    const existingTech = await prisma.technology.findUnique({
      where: { id },
    });

    if (!existingTech) {
      return c.json({ error: "Technology not found" }, 404);
    }

    const updatedTech = await prisma.technology.update({
      where: { id },
      data: {
        name: body.name ?? existingTech.name,
        type: body.type ?? existingTech.type,
        visibility: body.visibility ?? existingTech.visibility,
      },
    });

    return c.json({ tech: updatedTech });
  } catch (error) {
    return c.json({ error: "Failed to update technology" }, 500);
  }
});
//delete tech
app.delete("/api/v1/tech/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");

    const existingTech = await prisma.technology.findUnique({
      where: { id },
    });

    if (!existingTech) {
      return c.json({ error: "Technology not found" }, 404);
    }

    await prisma.technology.delete({
      where: { id },
    });

    return c.json({ message: "Technology deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete technology" }, 500);
  }
});
// Create StudyTimeline
app.post("/api/v1/study", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { instituteName, grade, information, subInformation, time } = body;

    const studyTimeline = await prisma.studyTimeline.create({
      data: {
        instituteName,
        grade,
        information,
        subInformation,
        time,
      },
    });

    return c.json({ studyTimeline });
  } catch (error) {
    console.error("Error creating study timeline:", error);
    return c.json({ error: "Failed to create study timeline" }, 500);
  }
});
// Read StudyTimeline
app.get("/api/v1/study/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");

    const studyTimeline = await prisma.studyTimeline.findUnique({
      where: { id: parseInt(id) },
    });

    if (!studyTimeline) {
      return c.json({ error: "Study timeline not found" }, 404);
    }

    return c.json({ studyTimeline });
  } catch (error) {
    return c.json({ error: "Failed to fetch study timeline" }, 500);
  }
});
// Update StudyTimeline
app.put("/api/v1/study/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");
    const body = await c.req.json();

    const existingStudyTimeline = await prisma.studyTimeline.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingStudyTimeline) {
      return c.json({ error: "Study timeline not found" }, 404);
    }

    const updatedStudyTimeline = await prisma.studyTimeline.update({
      where: { id: parseInt(id) },
      data: {
        instituteName:
          body.instituteName ?? existingStudyTimeline.instituteName,
        grade: body.grade ?? existingStudyTimeline.grade,
        information: body.information ?? existingStudyTimeline.information,
        subInformation:
          body.subInformation ?? existingStudyTimeline.subInformation,
        time: body.time ?? existingStudyTimeline.time,
        visibility: body.visibility ?? existingStudyTimeline.visibility,
      },
    });

    return c.json({ studyTimeline: updatedStudyTimeline });
  } catch (error) {
    return c.json({ error: "Failed to update study timeline" }, 500);
  }
});
// Delete StudyTimeline
app.delete("/api/v1/study/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");

    const existingStudyTimeline = await prisma.studyTimeline.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingStudyTimeline) {
      return c.json({ error: "Study timeline not found" }, 404);
    }

    await prisma.studyTimeline.delete({
      where: { id: parseInt(id) },
    });

    return c.json({ message: "Study timeline deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete study timeline" }, 500);
  }
});

// Create WorkTimeline
app.post("/api/v1/work", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { name, role, time, detail } = body;

    const workTimeline = await prisma.workTimeline.create({
      data: {
        name,
        role,
        time,
        detail: { set: detail }, // Use 'set' to insert array of strings
      },
    });

    return c.json({ workTimeline });
  } catch (error) {
    return c.json({ error: "Failed to create work timeline" }, 500);
  }
});

// Read WorkTimeline
app.get("/api/v1/work/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");

    const workTimeline = await prisma.workTimeline.findUnique({
      where: { id: parseInt(id) },
    });

    if (!workTimeline) {
      return c.json({ error: "Work timeline not found" }, 404);
    }

    return c.json({ workTimeline });
  } catch (error) {
    return c.json({ error: "Failed to fetch work timeline" }, 500);
  }
});

// Update WorkTimeline
app.put("/api/v1/work/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");
    const body = await c.req.json();

    const existingWorkTimeline = await prisma.workTimeline.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingWorkTimeline) {
      return c.json({ error: "Work timeline not found" }, 404);
    }

    const updatedWorkTimeline = await prisma.workTimeline.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name ?? existingWorkTimeline.name,
        role: body.role ?? existingWorkTimeline.role,
        time: body.time ?? existingWorkTimeline.time,
        detail: body.detail
          ? { set: body.detail }
          : { set: existingWorkTimeline.detail },
      },
    });

    return c.json({ workTimeline: updatedWorkTimeline });
  } catch (error) {
    return c.json({ error: "Failed to update work timeline" }, 500);
  }
});

// Delete WorkTimeline
app.delete("/api/v1/work/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");

    const existingWorkTimeline = await prisma.workTimeline.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingWorkTimeline) {
      return c.json({ error: "Work timeline not found" }, 404);
    }

    await prisma.workTimeline.delete({
      where: { id: parseInt(id) },
    });

    return c.json({ message: "Work timeline deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete work timeline" }, 500);
  }
});

app.post("/api/v1/projects", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { name, description, detail, tags, link, git, img, date, type } =
      body;

    const project = await prisma.project.create({
      data: {
        name,
        description: { set: description },
        detail,
        tags: { set: tags },
        link,
        git,
        img,
        date,
        type,
      },
    });

    return c.json({ project });
  } catch (error) {
    console.error("Error creating project:", error);
    return c.json({ error: "Failed to create project" }, 500);
  }
});

app.get("/api/v1/projects/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    return c.json({ project });
  } catch (error) {
    return c.json({ error: "Failed to fetch project" }, 500);
  }
});
app.put("/api/v1/projects/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");
    const body = await c.req.json();

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return c.json({ error: "Project not found" }, 404);
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: body.name ?? existingProject.name,
        description: body.description
          ? { set: body.description }
          : existingProject.description,
        detail: body.detail ?? existingProject.detail,
        tags: body.tags ? { set: body.tags } : existingProject.tags,
        link: body.link ?? existingProject.link,
        git: body.git ?? existingProject.git,
        img: body.img ?? existingProject.img,
        date: body.date ?? existingProject.date,
        type: body.type ?? existingProject.type,
      },
    });

    return c.json({ project: updatedProject });
  } catch (error) {
    return c.json({ error: "Failed to update project" }, 500);
  }
});
app.delete("/api/v1/projects/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return c.json({ error: "Project not found" }, 404);
    }

    await prisma.project.delete({
      where: { id },
    });

    return c.json({ message: "Project deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete project" }, 500);
  }
});

//default export
export default app;
